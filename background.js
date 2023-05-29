chrome.runtime.onMessage.addListener(function(mes, sender, cb){
	if(mes == "load"){ update(cb); }
	return true;
});

var KYOMU_URL = [
	"https://kyomu2.gakumu.titech.ac.jp/Titech/Student/%E7%A7%91%E7%9B%AE%E7%94%B3%E5%91%8A/PID1_0.aspx",
	"https://kyomu2.gakumu.titech.ac.jp/Titech/Student/%E7%A7%91%E7%9B%AE%E7%94%B3%E5%91%8A/PID1_1.aspx"
];

function update(cb){
	var courses = [[], [], [], []];
	var t2courses = [];
	
	var count = 0;
	/* 教務webのロード */
	for(var i=0; i<KYOMU_URL.length; i++){
		(function(i){
			var xhr = new XMLHttpRequest();
			xhr.open("get", KYOMU_URL[i]);
			xhr.responseType = "document";
			xhr.send();
			xhr.onloadend = function(){
				if(xhr.responseURL.indexOf("portal.nap.gsic.titech.ac.jp") != -1){
					cb({message: "一度教務webを開いて、再度更新してください"});
					return;
				}
				loadKyomuCourse(courses, xhr.responseXML);
				if(++count == KYOMU_URL.length+1){
					chrome.storage.local.set({"courses": JSON.stringify(courses), "t2courses": JSON.stringify(t2courses), "date": JSON.stringify(Math.floor(new Date().getTime()/1000))}, function(){});
					cb({message: "更新しました。", refresh: true});
				}
			};
		})(i);
	}
	
	/* t2scholaのロード */
	var xhr2 = new XMLHttpRequest();
	xhr2.open("get", "https://t2schola.titech.ac.jp/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=14029&urlscheme=mmt2schola");
	xhr2.responseType = "document";
	xhr2.send();
	xhr2.onload = function(){
		if(xhr2.responseURL.indexOf("portal.nap.gsic.titech.ac.jp") == -1){
			var href_text = xhr2.responseXML.getElementById("launchapp").href;
			token = atob(href_text.replace("mmt2schola://token=","")).split(":::")[1];
			var userid = "";
			var xhr = new XMLHttpRequest();
			xhr.open("post", "https://t2schola.titech.ac.jp/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=core_webservice_get_site_info", false);
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.send("wsfunction=core_webservice_get_site_info&wstoken=" + token);
			var result_json = JSON.parse(xhr.responseText);
			if(result_json.errorcode == "invalidtoken"){ loadTasksAfterUpdateToken(cb); }
			else{ userid = result_json.userid; }
			
			xhr = new XMLHttpRequest();
			xhr.open("post", "https://t2schola.titech.ac.jp/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=mod_assign_get_assignments", false);
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.send("wsfunction=mod_assign_get_assignments&wstoken=" + token);
			var result_json = JSON.parse(xhr.responseText);
			for(var i=0; i<result_json.courses.length; i++){
				t2courses[i] = {
					"id": result_json.courses[i].id,
					"fullname": result_json.courses[i].fullname,
					"shortname": result_json.courses[i].shortname
				};
			}
			if(++count == KYOMU_URL.length+1){
				chrome.storage.local.set({"courses": JSON.stringify(courses), "t2courses": JSON.stringify(t2courses), "date": JSON.stringify(Math.floor(new Date().getTime()/1000))}, function(){});
				cb({message: "更新しました。", refresh: true});
			}
		}
		else{
			cb({message: "Portalにログインしてください"});
			return;
		}
	};
}


// 教務webの曜日・時限表記からコマの配列を生成
function text2times(s){
	var t = s.match(/[月火水木金]\d-\d/g);
	if(!t){ return []; }
	for(var i=0, l=t.length; i<l; i++){
		if(t[i].charAt(3) - t[i].charAt(1) > 1){
			t[t.length] = t[i].charAt(0) + (Number(t[i].charAt(1))+2);
		}
		t[i] = t[i].substr(0,2);
		if(t[i].charAt(1) == "5" && s.indexOf("昼時間帯") != -1){
			t[i] += "昼";
		}
	}
	return t;
}

// HTMLDocumentから講義情報を読み込む
function loadKyomuCourse(course, html){
	for(var i=0; i<4; i++){
		var element = html.getElementsByClassName("tdQuarter" + i);
		for(var j=0; j<element.length; j++){
			if(element[j].getAttribute("data-jwc")){
				var room = element[j].children[3].innerText.match(/\(.*\)/);
				course[i-1][course[i-1].length] = {
					"time": text2times(element[j].children[3].innerText.replace(/[\n\s]{2,}/g, "")),
					"code": element[j].children[2].innerText.replace(/[\n\s]{2,}/g, ""),
					"title": element[j].children[0].innerText.replace(/[\n\s]{2,}/g, ""),
					"teacher": element[j].children[5].innerText.replace(/[\n\s]{2,}/g, ""),
					"room": room? room[0].substr(1, room[0].length-2) : ""
				};
			}
		}
	}
	for(var i=0; i<2; i++){
		var element = html.getElementsByClassName("tdQuarter" + [7, 8][i]);
		for(var j=0; j<element.length; j++){
			if(element[j].getAttribute("data-jwc")){
				course[i*2][course[i*2].length] = course[i*2+1][course[i*2+1].length] = {
					"time": text2times(element[j].children[3].innerText.replace(/[\n\s]{2,}/g, "")),
					"code": element[j].children[2].innerText.replace(/[\n\s]{2,}/g, ""),
					"title": element[j].children[0].innerText.replace(/[\n\s]{2,}/g, ""),
					"teacher": element[j].children[5].innerText.replace(/[\n\s]{2,}/g, ""),
					"room": room? room[0].substr(1, room[0].length-2) : ""
				};
			}
		}
	}
}

