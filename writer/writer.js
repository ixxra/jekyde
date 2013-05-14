
(function() {

if (!window.console) window.console = {log : function() {}};

var code = document.getElementById('codearea');
var show = document.getElementById('showarea');
var writer = {
    type: (location.search == '?page') ? 'page' : 'post',
    data: null,
    index: null,
    name: null,
    text: ''
};

$(function() {
    doResize();
    initBrowser();
    bindHandler();
});

$(window).resize(function() {
    doResize();
});

function doResize() {
    var ht = $(window).height() - $('#header').height();
    var wd = $(window).width() / 2;
    $('#file-edit').height(ht);
    $('#codewrap').height(ht);
    $('#codearea').height(ht);
    $('#showwrap').height(ht);
    $('#showarea').height(ht);
    $('#codewrap').width(wd);
    $('#showwrap').width(wd);
}

function initBrowser() {
    $('#file-edit').hide();
    $('#button-save').hide();
    var url = '../r/' + writer.type + 's';
    $('#nav-' + writer.type).addClass('current');
    $.get(url, function(items){
        writer.data = items;
        var content = '<table>';
        $.each(items, function(i, v){
            if (writer.type == 'post') {
                var a = v.metadate;
                var name = a[0] + '-' + a[1] + '-' + a[2] + ' ' + a[3] + ':' + a[4] + ':' + a[5];
            } else {
                var name = v.filename + '.md';
            }
            content += '<tr data-i="' + i + '">'
                      + '<td><span class="item-name" title="Click to modify">' + name + '</span></td>'
                      + '<td><span class="item-title">' + v.title + '</span></td>'
                      + '<td><span class="item-edit">Edit</span></td>'
                      + '<td><span class="item-delete">Delete</span></td>'
                      + '</tr>';
        });
        content += '</table>';
        $('#infomation').html(content);
        $('#file-list').fadeIn();
        $('#button-new').show();
    });
}

function bindHandler() {
    $('#file-list').click(function(e){
        var $target = $(e.target);
        if ($target.is('span')) {
            writer.index = $target.parent().parent().attr('data-i');
            var article = writer.data[writer.index];
            writer.name = article.filename;
            writer.text = '---\n' + article.head + '\n---\n' + article.body;
            if ($target.hasClass('item-edit')) {
                initEditor();
            } else if ($target.hasClass('item-name')) {
                fileRename($target.text());
            } else if ($target.hasClass('item-delete')) {
                fileDelete();
            }
        }
    });
    $('#button-new').click(function(e){
        function dateString(d){
            function pad(n){return n < 10 ? '0' + n : n}
            return [d.getFullYear(),
                pad(d.getMonth() + 1),
                pad(d.getDate()),
                pad(d.getHours()),
                pad(d.getMinutes()),
                pad(d.getSeconds())].join('-');
        }
        if (writer.type == 'post') {
            var d = new Date();
            writer.name = dateString(d);
        } else {
            var name = window.prompt('Please enter new page name:', 'noname.md');
            if (name) {
                writer.name = (name.slice(-3) == '.md') ? name.slice(0,-3) : name;
            } else return;
        }
        writer.text = '---\ntitle: Some Title\n---\n\nWrite here';
        initEditor();
    });
    $('#button-save').click(function(e){
        var url = '../r/' + writer.type + '/' + writer.name;
        var data = {
            type: writer.type,
            filename: writer.name,
            source: code.value
        };
        $.ajax({
            type: 'PUT',
            url: url,
            data: data,
            dataType: "json",
            success: function(data) {
                console.log(data);
                initBrowser();
            }
        });
    });
}

function fileRename(oldname) {
    var r = (writer.type == 'post') ? 'date' : 'name';
    var name = window.prompt('Please enter new ' + r + ' for the ' + writer.type, oldname);

    if (!name) return;
    name = (name.slice(-3) == '.md') ? name.slice(0,-3) : name;
    if (name == writer.name) return;
    if (writer.type == 'post') {
        if (verifyDate(name)) {
            name = name.replace(/[ :]/g, '-');
        } else {
            alert('Invalid Date Format!');
            return;
        }
    }
    if (findFile(name)) {
        alert('The same ' + r + ' already exists!');
        return;
    }

    var url = '../r/' + writer.type + '/' + writer.name;
    var data = {
        type: writer.type,
        newname: name
    };
    $.post(url, data, function(data) {
            console.log(data);
            initBrowser();
    });
}

function fileDelete() {
    if (confirm('Do you really want to delete this article?')) {
        var url = '../r/' + writer.type + '/' + writer.name;
        var data = {
            type: writer.type
        };
        $.ajax({
            type: 'DELETE',
            url: url,
            data: data,
            dataType: "json",
            success: function(data) {
                console.log(data);
                initBrowser();
            }
        });
    }
}

function findFile(name) {
    var data = writer.data;
    for (var i = 0; i < data.length; i++) {
        if (data[i].filename == name) return true;
    }
    return false;
}

function verifyDate(name) {
    var r = [
        /^(\d{4})-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/,
        /^(\d{4})-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d)$/,
        /^(\d{4})-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])$/
    ];
    for (var i = 0; i < r.length; i++) {
        if (r[i].test(name)) return true;
    }
    return false;
}

function initEditor() {
    $('#file-list').hide();
    $('#button-new').hide();
    code.value = writer.text;
    preview();
    $('#file-edit').fadeIn();
    $('#codearea').on('keyup', preview).on('cut paste', timerview);
    $('#button-save').show();
}

function timerview() {
    setTimeout(preview, 100);
}

function preview() {
    show.innerHTML = marked(escapeTex(getBody(code.value)));
    MathJax.Hub.Typeset(show);
}

function getBody(text) {
    var re = /^---(\n|\r\n|\r)([\w\W]+?)\1---\1([\w\W]*)/, result = re.exec(text);
    return (result ? result[3] : text);
}

function escapeTex(text) {
    var out = text.replace(/(\${1,2})((?:\\.|[^$])*)\1/g, function(m){
        m = m.replace(/_/g, '\\_')
             .replace(/</g, '\\lt ')
             .replace(/\|/g, '\\vert ')
             .replace(/\[/g, '\\lbrack ')
             .replace(/\\{/g, '\\lbrace ')
             .replace(/\\}/g, '\\rbrace ')
             .replace(/\\\\/g, '\\\\\\\\');
        return m;
    });
    return out;
}

})();
