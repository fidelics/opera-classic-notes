document.addEventListener("DOMContentLoaded", function (event) {
    document.title = chrome.i18n.getMessage("extName");
});

String.prototype.replaceAll = function (search, replace) {
    return this.split(search).join(replace);
};

function copy_text(text) {
    document.oncopy = function (event) {
        event.clipboardData.setData("Text", text);
        event.preventDefault();
    };
    document.execCommand("Copy");
    document.oncopy = undefined;
}

chrome.contextMenus.create({
    title: chrome.i18n.getMessage("copySelected"),
    id: "ocn_copy",
    type: "normal",
    contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === "ocn_copy") {
        var copied_text = info.selectionText;
        var source_url = info.pageUrl;
        $('#add').click();
        $('li.loaded').data('source', source_url);

        var title_holder = $('li.loaded > div');
        var f_img = document.createElement('img');
        $(f_img).attr('src', "opera://favicon/" + source_url);
        $(f_img).addClass('favicon');
        $(f_img).prependTo(title_holder);
        $(title_holder).addClass('no_icon');

        $('#editor').val(copied_text).trigger('input');
        notes.save();
    }
});

$(function () {

    $('#add_button_menu').text(chrome.i18n.getMessage("addNote"));
    $('#add_folder_button_menu').text(chrome.i18n.getMessage("addFolder"));
    $('#copy_text').text(chrome.i18n.getMessage("copyText"));
    $('#delete_note').text(chrome.i18n.getMessage("deleteNote"));

    notes = {


        load:function(){
            return notes.load_sync()
        },
        save:function(){
            return notes.save_sync()
        },
        load_local: function () {

            if (localStorage.getItem('_notes') === null) {
                localStorage['_notes'] = JSON.parse(new Array());
            }

            notes_storage = localStorage['_notes'];
            notes.load_from_array(JSON.parse(notes_storage));
        },
        load_sync:function(){
            chrome.storage.sync.get('_notes', function (object) {
                notes.load_from_array(JSON.parse(object['_notes']));
            });
        },
        save_local: function () {
            localStorage['_notes'] = JSON.pruned(notes.get_as_json());
        },
        save_sync: function () {
            chrome.storage.sync.set({'_notes': JSON.pruned(notes.get_as_json())});
        },
        load_from_array: function (folder_array) {
            notes.load_folder_from_array($('#list'), folder_array);
        },
        load_folder_from_array: function (folder_dom, folder_array) {

            for (i in folder_array) {
                var current = folder_array[i];
                var li = document.createElement('li');
                var title_holder = document.createElement('div');

                $(li).appendTo(folder_dom);

                if ('title' in current) {
                    var title = current.title;
                    title = title.replaceAll('<br>', ' ');
                    $(title_holder).html('<span></span>');
                    $(title_holder).find('> span').text(title);
                }

                if (current.type == 'note') {
                    $(li).addClass('note');
                    $(li).data('content', current.content);

                    if ("source" in current) {
                        $(li).data('source', current.source);
                        var f_img = document.createElement('img');
                        $(f_img).attr('src', "opera://favicon/" + current.source);
                        $(f_img).addClass('favicon');
                        $(f_img).prependTo(title_holder);

                        $(title_holder).addClass('no_icon');
                    }

                    $(title_holder).appendTo(li);
                } else if (current.type == 'folder') {
                    $(li).addClass('folder');
                    //$(li).addClass('opened');

                    $(title_holder).appendTo(li);

                    var ol = document.createElement('ol');
                    $(ol).appendTo(li);
                    notes.load_folder_from_array($(ol), current.content);
                }


            }


        },
        get_as_json: function () {
            return notes.get_folder_as_json($('#list'));
        },
        get_folder_as_json: function (folder_object) {
            var ocn = [];

            folder_object.find('> li').each(function () {

                var content, type;

                if ($(this).hasClass('folder')) {
                    type = 'folder';
                    content = notes.get_folder_as_json($(this).find('> ol'));
                } else if ($(this).hasClass('note')) {
                    type = 'note';
                    content = $(this).data('content');
                }

                ocn.push({
                    'type': type,
                    'content': content,
                    'title': $(this).find('> div > span').text(),
                    'source': $(this).data('source')
                });
            });

            return ocn;
        }


    };

    // Activate drag&drop sorting

    $('#list').nestedSortable({
        handle: 'div',
        items: 'li',
        toleranceElement: '> div',
        disableNestingClass: 'note',
        maxLevels: 5,
        tolerance: 'pointer',
        scrollSpeed: 2,
        distance: 10,
        update: function () {
            notes.save();
        }
        //delay: 150

    });

    // Activate splitter

    var splitter_position = localStorage['splitter_position'];

    if (!splitter_position)
    {
        splitter_position:'70%';
    }

    $('#main').split({
        orientation: 'horizontal',
        limit: 10,
        position:splitter_position,
        onDragEnd:function(event,position)
        {
            localStorage['splitter_position'] = Math.round(position / ($('body').height() / 100)) + '%';
        }
    });

    // Activate editor

    $('#editor').click(function () {
        $(this).trigger('focus');
    });

    $('#editor').on('blur keyup paste input', function () {

        var title = $(this).val().substr(0, 150);

        $('li.loaded').find('> div > span').html(title);

        if ($('li.loaded').hasClass('note')) {
            $('li.loaded').data('content', $(this).val());
        }

        if (typeof save_notes != 'undefined') {
            clearTimeout(save_notes);
        }

        save_notes = setTimeout(function () {
            notes.save();
        }, 500);
    });

    // Activate top menu

    $('#add_menu_switcher').click(function (event) {

        event.stopPropagation();

        var is_visible = false;

        if ($('#add').hasClass('active')) {
            is_visible = true;
        }

        if (!is_visible) {
            $('#add').addClass('active');
        } else {
            $('#add').removeClass('active');
        }

    });

    $('.menu li').click(function () {
        $('#add').removeClass('active');
    });

    $('html').click(function () {
        $('.button.active').removeClass('active');
        $('#context').hide();
    });

    // Context menu actions

    $('#copy_text').click(function () {
        copy_text($('li.loaded').data('content'));
        $('#context').hide();
    });

    $('#delete_note,#delete_current').click(function () {
        var e = $.Event('keyup');
        e.keyCode = 46; // Delete key
        $('html').trigger(e);
        $('#context').hide();
    });

    // Search

    $('#clearsearch').click(function () {
        $('#searchbox').val('').trigger('input');
    });

    $('#searchbox').on('blur keyup paste input', function () {

        var search_for = $(this).val();

        if (!search_for) {
            $('#list li').show();
            return;
        }

        $('#list li').each(function () {

            if ($(this).hasClass('note')) {
                var content = $(this).data('content');
            }
            else
            {
                var content = $(this).find('> div > span').text();
            }

            var pos = 0;

            if (!content) {
                $(this).hide();
            } else {
                pos = content.toLowerCase().indexOf(search_for.toLowerCase());

                if (pos == -1) {
                    $(this).hide();
                } else {
                    $(this).show();
                }
            }


        });

        $('#list li').each(function () {
            if ($(this).is(':visible') || $(this).css('display') != 'none')
            {
                $(this).parents('.folder').show().addClass('opened');
            }
        });

    });

    // Processing keys

    $('html').on('keyup', function (event) {


        if (event.keyCode == 46) // 46 = Delete key
        {
            if ($('#editor').is(':focus') || $('#list li.loaded').length != 1) {
                return;
            }

            if (
                $('#list li.loaded').hasClass('folder') && $('#list li.loaded > ol > li').length > 0 && !confirm(chrome.i18n.getMessage("deleteConfirm"))) {
                return;
            }

            next_element = '';

            if ($('#list li.loaded').next('li.note,li.folder').length) {
                next_element = $('#list li.loaded').next('li.note,li.folder');
            } else {
                next_element = $('#list li.loaded').prev('li.note,li.folder');
            }

            $('#list li.loaded').remove();
            $('#editor').val('').blur();

            next_element.click();
            notes.save();

            event.stopPropagation();
        }

    });

    // Adding notes...

    $('#add').click(function () {

        var folder = $('#list');

        if ($('li.loaded').closest('.folder').length > 0) {
            folder = $('li.loaded').closest('.folder').find('> ol');
        }

        var li = document.createElement('li');

        $(li).prepend('<div><span></span></div>');
        $(li).appendTo(folder);
        $(li).addClass('note');
        $(li).parents('li.folder:not(.opened)').addClass('opened');

        $(li).click();
        $('#editor').focus();

    });

    // Adding folders...

    $('#add_folder_button_menu').click(function () {

        event.stopPropagation();

        var folder = $('ol#list');

        if ($('li.loaded').closest('.folder').length > 0) {
            folder = $('li.loaded').closest('.folder').find('> ol');
        }

        var li = document.createElement('li');
        var ol = document.createElement('ol');

        $(ol).appendTo(li);

        $(li).addClass('folder opened');
        $(li).appendTo(folder);
        $(li).prepend('<div><span>' + chrome.i18n.getMessage("newFolder") + '</span></div>');

        $(li).click();

    });


    $('body').on('contextmenu', '#toolbar', function (event) {
        return false;
    });

    $('#toolbar').on('contextmenu', 'input', function (event) {
        event.stopPropagation();
        return true;
    });

    // Processing clicks on list...


    $('#list').on('contextmenu', 'li.note,li.folder', function (event) {

        if ($(this).hasClass('folder')) {
            $('#copy_text').hide();
        } else {
            $('#copy_text').show();
        }

        $(this).click();

        // ToDo: Ужасно топорный код с «волшебными числами».
        // Нужно переписать.

        var context_left = event.pageX + 5;
        var context_top = event.pageY - 10;

        if ((context_left + $('#context').width()) > $('body').width()) {
            context_left = context_left - $('#context').width() - 10;

            if ((context_left + $('#context').width()) < $('body').width()) {
                context_left = (event.pageX) - ($('#context').width / 2);
            }
        }

        $('#context').css('left', context_left).css('top', context_top).show();

        return false;

    });

    $('#list').on('click', 'li.note,li.folder', function (event) {

        $('#context').hide();
        $('#add').removeClass('active');
        event.stopPropagation();

        var dbl_click_time = 300;

        if (typeof previous_click != 'undefined' && (Date.now() - previous_click) < dbl_click_time && $(this).data('source')) {
            chrome.tabs.create({
                url: $(this).data('source'),
                active: true
            });

            return;
        }

        previous_click = Date.now();

        // Setting active/unactive status

        // if (!event.ctrlKey)
        // {
        $('#list li').removeClass('active');
        // }

        $(this).toggleClass('active');
        $('#editor').blur();

        $('li.note, li.folder, li.separator').removeClass('loaded');
        $(this).addClass('loaded');

        // Loading note

        if ($(this).hasClass('folder')) {
            $('#editor').val($(this).find('> div > span').text());
        } else if ($(this).hasClass('note')) {
            if ($(this).data('content')) {
                $('#editor').val($(this).data('content'));
            } else {
                $('#editor').val('');
            }
        }

        // Toggling folders

        var click_x_zone = event.pageX - $(this).parent().offset().left;

        if ($(this).hasClass('folder') && click_x_zone < 20) {
            $(this).toggleClass('opened');
        }

    });


    notes.load();

    $('ol#list').scrollTop($('ol#list')[0].scrollHeight);
    $('ol#list > li:last').click();

});