chrome.runtime.onMessage.addListener(function (html) {
	$(':focus').val($(':focus').val() + html);
	$(':focus').text($(':focus').text() + html);
});