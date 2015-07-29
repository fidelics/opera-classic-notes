chrome.contextMenus.create({
	title: chrome.i18n.getMessage("copySelected"),
	id: "ocn_copy",
	type: "normal",
	contexts: ["selection"]
});

chrome.contextMenus.create({
	title: chrome.i18n.getMessage("Paste"),
	id: "ocn_paste",
	type: "normal",
	contexts: ["editable"]
});

chrome.storage.sync.get('_notes', function (object) {
	addContext('ocn_paste', JSON.parse(object['_notes']))
});

chrome.storage.onChanged.addListener(function (changes) {
	if (changes['_notes']) {
		chrome.contextMenus.removeAll(function () {
			chrome.contextMenus.create({
				title: chrome.i18n.getMessage("copySelected"),
				id: "ocn_copy",
				type: "normal",
				contexts: ["selection"]
			});

			chrome.contextMenus.create({
				title: chrome.i18n.getMessage("Paste"),
				id: "ocn_paste",
				type: "normal",
				contexts: ["editable"]
			});
			addContext('ocn_paste', JSON.parse(changes['_notes'].newValue || ''));
		});
	}
})

var map = {};

function addContext (parrentID, context) {
	if (context.length < 1) {
		chrome.contextMenus.remove(parrentID);
	} else {
		for(var i = 0; i < context.length; i++) {
			if (context[i].title) {
				map[parrentID + i] = context[i].content;
				chrome.contextMenus.create({
					title: context[i].title,
					id: parrentID + i,
					parentId: parrentID,
					type: "normal",
					contexts: ["editable"],
					onclick: function(info) {
						chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
							chrome.tabs.sendMessage(tabs[0].id, map[info.menuItemId], function(response) {
								// console.log(response);
							});
						});
					}
				});
				if (context[i].type === 'folder') {
					addContext(parrentID + i, context[i].content );
				}
			}
		}
	}
}