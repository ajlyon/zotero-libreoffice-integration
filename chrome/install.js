/*
    ***** BEGIN LICENSE BLOCK *****
	
	Copyright (c) 2011  Zotero
	                    Center for History and New Media
						George Mason University, Fairfax, Virginia, USA
						http://zotero.org
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

const UNOPKG_LOCATIONS = {
	Mac:[
		"/Applications/LibreOffice.app/Contents/MacOS/unopkg",
		"/Applications/OpenOffice.org.app/Contents/MacOS/unopkg",
		"/Applications/NeoOffice.app/Contents/MacOS/unopkg",
		"/Applications/OpenOffice.org 2.4.app/Contents/MacOS/unopkg"
	],
	Win:[
		"C:\\Program Files\\LibreOffice 3\\program\\unopkg.exe",
		"C:\\Program Files (x86)\\LibreOffice 3\\program\\unopkg.exe",
		"C:\\Program Files\\OpenOffice.org 3\\program\\unopkg.exe",
		"C:\\Program Files (x86)\\OpenOffice.org 3\\program\\unopkg.exe",
		"C:\\Program Files\\OpenOffice.org 2.4\\program\\unopkg.exe",
		"C:\\Program Files (x86)\\OpenOffice.org 2.4\\program\\unopkg.exe",
		"C:\\Program Files\\OpenOffice.org 2\\program\\unopkg.exe",
		"C:\\Program Files (x86)\\OpenOffice.org 2\\program\\unopkg.exe"
	],
	Other:[
		"/usr/bin/unopkg",
		"/opt/libreoffice/program/unopkg",
		"/opt/libreoffice3/program/unopkg",
		"/opt/openoffice.org3.3/program/unopkg",
		"/usr/local/opt/openoffice.org3.3/program/unopkg",
		"/opt/openoffice.org3.2/program/unopkg",
		"/usr/local/opt/openoffice.org3.2/program/unopkg",
		"/opt/openoffice.org3.1/program/unopkg",
		"/usr/local/opt/openoffice.org3.1/program/unopkg",
		"/opt/openoffice.org3/program/unopkg",
		"/usr/local/opt/openoffice.org3/program/unopkg",
		"/usr/lib64/ooo3/program/unopkg",
		"/usr/lib/ooo3/program/unopkg",
		"/usr/lib64/openoffice.org3/program/unopkg",
		"/usr/lib/openoffice.org3/program/unopkg",
		"/usr/lib/openoffice/program/unopkg",
		"/usr/local/opt/openoffice.org2/program/unopkg",
		"/opt/openoffice.org2/program/unopkg",
		"/usr/local/opt/openoffice.org2.4/program/unopkg",
		"/opt/openoffice.org2.4/program/unopkg"
	]
};			

const UNOPKG_RELPATHS = {
	Mac:[
		"Contents/MacOS/unopkg"
	],
	Win:[
		"program\\unopkg.exe"
	],
	Other:[
		"program/unopkg"
	]
};


var wizard, javaCommonCheckComplete, platform;
var breadcrumbs = [];

/*** ROUTINES RUN ON LOAD ***/

/**
 * Called on initial wizard load
 */
function onLoad() {
	wizard = document.documentElement;
	javaCommonCheckRun = false;
		
	if(Zotero.isMac) {
		platform = "Mac";
	} else if(Zotero.isWin) {
		platform = "Win";
	} else {
		platform = "Other";
	}
	
	for(var param in window.arguments[0].wrappedJSObject) window[param] = window.arguments[0].wrappedJSObject[param];
		
	checkJavaCommon(function() {
		// if openoffice.org-java-common check succeeds, we don't need to show the page for it
		javaCommonCheckComplete = true;
		
		if(wizard.currentPage.id === "java-common-page") {
			wizard.canAdvance = true;
			wizard.advance();
		}
		
		wizard.getPageById("intro").next = "openoffice-installations";
		wizard.getPageById("java-common").next = "openoffice-installations";
	}, function() {
		// if openoffice.org-java-common check fails, we make sure it gets installed
		javaCommonCheckComplete = true;
		
		if(wizard.currentPage.id === "java-common-page") {
			wizard.canAdvance = true;
		}
		
		wizard.getPageById("intro").next = "java-common";
		wizard.getPageById("java-common").next = "java-common-install";
		document.getElementById("java-common-required").hidden = false;
		document.getElementById("java-common-progress").hidden = true;
	});
}

/**
 * Check for openoffice.org-java-common and prompt user to install if necessary, or else hide
 * java-common-page
 */
function checkJavaCommon(checkSucceeded, checkFailed) {
	// no need to check on Mac or Win
	if(Zotero.isMac || Zotero.isWin) {
		checkSucceeded();
		return;
	}
	
	// check for dpkg
	var dpkg = ZoteroOpenOfficeIntegration.getFile("/usr/bin/dpkg");
	if(!dpkg.exists()) {
		checkSucceeded();
		return;
	}
	
	// check for bash
	var bash = ZoteroOpenOfficeIntegration.getFile("/bin/bash");
	if(!bash.exists()) {
		checkSucceeded();
		return;
	}
	
	// init processes
	var bashProc = Components.classes["@mozilla.org/process/util;1"].
			createInstance(Components.interfaces.nsIProcess);
	bashProc.init(bash);
	
	// check for openoffice.org-writer with openoffice.org-java-common available but not installed
	bashProc.runAsync(["-c", "dpkg -l | grep 'openoffice\.org-writer'"], 2, {"observe":function(subject1, topic1) {
		if(topic1 === "process-finished" && !bashProc.exitValue) {
			Zotero.debug("ZoteroOpenOfficeIntegration: openoffice.org-writer is installed");
			// only care if openoffice.org-writer is installed; otherwise, we are probably not using
			// default packages and probably have Java
			bashProc.runAsync(
					["-c", "[ `apt-cache search 'openoffice\.org-java-common' | wc -l` != 0 ]"], 2,
					{"observe":function(subject2, topic2) {
				// only care if openoffice.org-java-common is available for install; otherwise, we
				// are probably using packages that include Java
				if(topic2 === "process-finished" && !bashProc.exitValue) {
					Zotero.debug("ZoteroOpenOfficeIntegration: openoffice.org-java-common is available");
					bashProc.runAsync(["-c", "dpkg -l | grep 'openoffice\.org-java-common'"], 2,
							{"observe":function(subject3, topic3) {
						wizard.canAdvance = true;
						if(topic3 === "process-failed" || bashProc.exitValue) {
							Zotero.debug("ZoteroOpenOfficeIntegration: openoffice.org-java-common is not installed");
							checkFailed();
						} else {
							Zotero.debug("ZoteroOpenOfficeIntegration: openoffice.org-java-common is installed");
							checkSucceeded();
						}
					}});
				} else {
					Zotero.debug("ZoteroOpenOfficeIntegration: openoffice.org-java-common is unavailable");
					checkSucceeded();
				}
			}});
		} else {
			Zotero.debug("ZoteroOpenOfficeIntegration: openoffice.org-writer is not installed");
			checkSucceeded();
		}
	}});
}

/*** intro-page ***/

/**
 * Called when java-common wizardpage is shown
 */
function introPageShown() {
	document.documentElement.canAdvance = true;
}

/*** java-common-page ***/

/**
 * Called when java-common wizardpage is shown
 */
function javaCommonPageShown() {
	wizard.canAdvance = javaCommonCheckComplete;
}

/*** java-common-install-page ***/

/**
 * Called when java-common-install wizardpage is shown
 */
function javaCommonInstallPageShown() {
	wizard.canAdvance = false;
	wizard.canRewind = false;
	
	var proc = Components.classes["@mozilla.org/process/util;1"].
			createInstance(Components.interfaces.nsIProcess);
	
	// first try to install via apturl
	var apturl = ZoteroOpenOfficeIntegration.getFile("/usr/bin/apturl");
	if(apturl.exists()) {
		proc.init(apturl);
		proc.runAsync(["apt:openoffice.org-java-common"], 1, {"observe":function(subject, topic) {
			wizard.canAdvance = true;
			if(topic === "process-finished") {
				wizard.getPageById("intro").next = "openoffice-installations";
				wizard.advance();
			} else {
				document.getElementById("java-common-install-progress").hidden = true;
				document.getElementById("java-common-install-error").hidden = false;
			}
			wizard.canAdvance = true;
			wizard.canRewind = true;
		}});
	} else {
		// if no apturl, try to install via xterm
		var xterm = ZoteroOpenOfficeIntegration.getFile("/usr/bin/xterm");
		if(xterm.exists()) {
			proc.init(xterm);
			proc.runAsync(["-e", "sudo apt-get install openoffice.org-java-common; sleep 2;"], 2,
					{"observe":function(subject, topic) {
				checkJavaCommon(function() {
					// if install appears to have succeeded
					wizard.getPageById("intro").next = "openoffice-installations";
					wizard.advance();
				}, function() {
					// if install appears to have failed
					document.getElementById("java-common-install-progress").hidden = true;
					document.getElementById("java-common-install-error").hidden = false;
				});
				wizard.canAdvance = true;
				wizard.canRewind = true;
			}});
		} else {
			document.getElementById("java-common-install-progress").hidden = true;
			document.getElementById("java-common-install-error").hidden = false;
			wizard.canAdvance = true;
			wizard.canRewind = true;
		}
	}
}

/*** openoffice-installations-page ***/

/**
 * Called when openoffice-installations wizardpage is shown
 */
function openofficeInstallationsPageShown() {
	var installations = ZoteroOpenOfficeIntegration.getInstallations();
	var haveAlreadySelectedInstallations = !!installations.length;
	var uncheckedInstallations = {};
	
	// look in obvious places for unopkg
	var potentialLocations = UNOPKG_LOCATIONS[platform];
	for each(var potentialLocation in potentialLocations) {
		var file = ZoteroOpenOfficeIntegration.getFile(potentialLocation);
		
		if(file.exists()) {
			// skip files that are symlinked to existing locations, or that we already know of
			if(installations.indexOf(file.path) === -1) {
				installations.push(file.path);
				if(haveAlreadySelectedInstallations) uncheckedInstallations[file.path] = true;
			}
		}
	}
	
	// add installations to listbox
	var listbox = document.getElementById("installations-listbox");
	while(listbox.hasChildNodes()) listbox.removeChild(listbox.firstChild);
	for each(var installation in installations) {
		var itemNode = document.createElement("listitem");
		itemNode.setAttribute("type", "checkbox");
		itemNode.setAttribute("label", installation);
		if(!uncheckedInstallations.hasOwnProperty(installation)) {
			itemNode.setAttribute("checked", "true");
		}
		listbox.appendChild(itemNode);
	}
	
	wizard.canAdvance = !!installations.length;
}

/**
 * Called to add an OpenOffice.org installation directory
 */
function openofficeInstallationsAddDirectory() {
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	
	// show dialog to select directory
	if(Zotero.isMac) {
		fp.init(window, "Select the OpenOffice.org application", Components.interfaces.nsIFilePicker.modeOpen);
		fp.appendFilter("Mac OS X Application Bundle", "*.app");
	} else {
		fp.init(window, "Select the OpenOffice.org installation directory", Components.interfaces.nsIFilePicker.modeGetFolder);
	}
	
	if(fp.show() === Components.interfaces.nsIFilePicker.returnOK) {
		// find unopkg executable
		var unopkg = fp.file.clone();
		unopkg = unopkg.QueryInterface(Components.interfaces.nsILocalFile);
		unopkg.appendRelativePath(UNOPKG_RELPATHS[platform]);
		
		if(!unopkg.exists()) {
			unopkg = fp.file.clone().parent;
			unopkg = unopkg.QueryInterface(Components.interfaces.nsILocalFile);
			unopkg.appendRelativePath(UNOPKG_RELPATHS[platform]);
		}
		
		if(!unopkg.exists()) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
			promptService.alert(window, "unopkg Not Found", "The unopkg executable could not be "+
				"found in the selected OpenOffice.org installation directory. Please ensure that "+
				"you have selected the correct directory and try again.");
		}
		
		// ensure unopkg is not already in list
		var listbox = document.getElementById("installations-listbox");
		var nodes = listbox.childNodes;
		for(var i=0; i<nodes.length; i++) {
			if(nodes[i].label === unopkg.path) return;
		}
		
		// add unopkg to list
		var itemNode = document.createElement("listitem");
		itemNode.setAttribute("type", "checkbox");
		itemNode.setAttribute("label", unopkg.path);
		itemNode.setAttribute("checked", "true");
		listbox.appendChild(itemNode);
		
		wizard.canAdvance = true;
	}
}

/**
 * Called to reveal OpenOffice.org extension for manual installation
 */
function openofficeInstallationsManualInstallation() {
	// clear saved unopkg paths so we force manual install on upgrade
	ZoteroPluginInstaller.prefBranch.setCharPref(
		ZoteroOpenOfficeIntegration.UNOPKG_PATHS_PREF, "[]");
	
	// get oxt path and set it in the dialog
	var oxtPath = ZoteroOpenOfficeIntegration.getOxtPath();
	document.getElementById("installation-manual-path").textContent = oxtPath.path;
	try {
		oxtPath.QueryInterface(Components.interfaces.nsILocalFile).reveal();
	} catch(e) {
		Zotero.logError(e);
	}
	
	// we were successful and installation was complete
	ZoteroPluginInstaller.success();
	showInstallationComplete("manual");
}

/**
 * Called when an OpenOffice.org installation is checked or unchecked
 */
function openofficeInstallationsListboxSelectionChanged() {
	var listbox = document.getElementById("installations-listbox");
	for each(var node in listbox.childNodes) {
		if(node.checked) {
			wizard.canAdvance = true;
			return;
		}
	}
	wizard.canAdvance = false;
}

/**
 * Called to specify what should be shown on installation-complete-page
 * @param {String} vboxToShow Which vbox should be visible
 */
function showInstallationComplete(vboxToShow) {
	for each(var vbox in ["manual", "error", "successful"]) {
		var vboxElem = document.getElementById("installation-"+vbox);
		vboxElem.hidden = vbox != vboxToShow;
	}
	wizard.goTo("installation-complete");
	wizard.canAdvance = true;
	wizard.canRewind = true;
}

/*** installing-page ***/

/**
 * Called when installing-page wizardpage is shown
 */
function installingPageShown() {
	wizard.canAdvance = false;
	wizard.canRewind = false;
	
	var listbox = document.getElementById("installations-listbox");
	var paths = [];
	for each(var node in listbox.childNodes) {
		if(node.checked) paths.push(node.label);
	}
	ZoteroOpenOfficeIntegration.installComponents(paths,
			function(success) {
		showInstallationComplete(success ? "successful" : "error");
		ZoteroPluginInstaller[success ? "success" : "error"]();
	});
}

/*** installation-complete-page ***/

function reportErrors() {
	var errors = Zotero.getErrors(true);
	var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
			   .getService(Components.interfaces.nsIWindowWatcher);
	var data = {
		msg: Zotero.getString('errorReport.followingErrors', Zotero.appName),
		e: errors.join('\n\n'),
		askForSteps: true
	};
	var io = { wrappedJSObject: { Zotero: Zotero, data:  data } };
	var win = ww.openWindow(null, "chrome://zotero/content/errorReport.xul",
				"zotero-error-report", "chrome,centerscreen,modal", io);
}

/*** WIZARD BUTTON HANDLERS ***/

function wizardCancelled() {
	if(wizard.currentPage.pageid != "installation-complete") {
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
		var cancel = promptService.confirm(window, "Zotero OpenOffice.org Integration", "Are you sure you want "+
			"to cancel Zotero OpenOffice.org/NeoOffice/LibreOffice Integration installation? To "+
			"install later, visit the Cite pane of the Zotero preferences.");
		if(cancel) {
			ZoteroPluginInstaller.cancelled();
			return true;
		}
		return false;
	}
}

function wizardBack() {
	var pageid = wizard.currentPage.pageid;
	
	if(pageid === "java-common") {
		wizard.goTo("intro");
	} else if(pageid === "java-common-install") {
		wizard.goTo("java-common");
	} else if(pageid === "openoffice-installations") {
		wizard.goTo(wizard.getPageById("intro").next === "openoffice-installations" ? "intro" : "java-common");
	} else if(pageid === "installing" || pageid === "installation-complete") {
		wizard.goTo("openoffice-installations");
	} else {
		throw "Don't know how to go back from "+pageid;
	}
}

/*** EVENT LISTENERS ***/

window.addEventListener("load", onLoad, false);