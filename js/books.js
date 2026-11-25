/* 本の登録口:各ファイル(js/data/*.js)が GK.addBook({...}) で本棚に追加する */
window.GK = { books: [], addBook: function (b) { this.books.push(b); } };
