// 秒数を経過時間文字列に変換
function sec2elapsed(t){
	if(t < 60){ return t + "秒前"; }
	if(t < 60*60){ return Math.floor(t/60) + "分前"; }
	if(t < 60*60*48){ return Math.floor(t/60/60) + "時間前"; }
	return Math.floor(t/60/60/24) + "日前";
}

// 更新ボタンを押した時の処理
document.getElementById("reflesh").onclick = function(){
	document.getElementById("date").innerHTML = "更新中…";
	chrome.runtime.sendMessage("load" ,function(r){
		if(r.refresh){ location.reload(); }
		else{
			document.getElementById("date").innerHTML = r.message;
		}
	});
	return false;
};


// クオータ切り替えボタンを押した時の処理
for(var i=0; i<4; i++){
	(function(i){
		document.getElementById("quarter" + (i+1)).onclick = function(){
			chrome.storage.local.set({"quarter": (i+1)}, function(){});
			location.reload();
			return false;
		};
	})(i);
}


// データ読込・描画処理
chrome.storage.local.get(["date", "courses", "t2courses", "quarter"], function(s){
	var time_now = Math.floor(new Date().getTime()/1000);
	if(s.date){
		document.getElementById("date").innerHTML = "更新: " + sec2elapsed(time_now - s.date);
	}
	else{
		document.getElementById("date").innerHTML = "更新ボタンを押してください→";
	}
	courses = s.courses? JSON.parse(s.courses) : [];
	t2courses = s.t2courses? JSON.parse(s.t2courses) : [];
	quarter = s.quarter? s.quarter : 1;
	
	document.getElementById("quarter" + quarter).className += " now";
	
	for(var i=0; i<5; i++){
		var tr = document.createElement("tr");
		var s = "<th>" + ["8:50<br>~<br>10:30", "10:45<br>~<br>12:25", "13:25<br>~<br>15:25", "15:40<br>~<br>17:20", "17:30<br>~<br>19:10"][i] + "</th>";
		for(var j=0; j<5; j++){
			var subj = "";
			var room = "";
			loop: for(var n=0; n<courses[quarter-1].length; n++){
				for(var m=0; m<courses[quarter-1][n].time.length; m++){
					if(courses[quarter-1][n].time[m].indexOf(["月","火","水","木","金"][j]+(i*2+1)) != -1){
						subj = courses[quarter-1][n].title;
						room = courses[quarter-1][n].room;
						break loop;
					}
				}
			}
			if(subj){
				var id;
				for(var n=0; n<t2courses.length; n++){
					if(t2courses[n].fullname.replace(/[【】\s]/g, "").indexOf(subj.replace(/[【】\s]/g, "")) != -1){
						id = t2courses[n].id;
					}
				}
				if(id){
					s += ("<td><a href=\"https://t2schola.titech.ac.jp/course/view.php?id=" + id + "\" target=\"_blank\"><span class=\"t2\" title=\"" + room + "\">" + subj + "</span></a></td>");
				}
				else{
					s += ("<td><span title=\"" + room + "\">" + subj + "</span></td>");
				}
			}
			else{
				s += "<td></td>";
			}
		}
		tr.innerHTML = s;
		document.getElementById("course").appendChild(tr);
	}
});
