'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var visit = require('unist-util-visit');

var mainLineRegex = new RegExp(/((\+)|(\|)).+((\|)|(\+))/);
var totalMainLineRegex = new RegExp(/^((\+)|(\|)).+((\|)|(\+))$/);
var headerLineRegex = new RegExp(/^\+=[=+]+=\+$/);
var partLineRegex = new RegExp(/\+-[-+]+-\+/);
var separationLineRegex = new RegExp(/^\+-[-+]+-\+$/);

module.exports = plugin;

// A small class helping table generation

var Table = function () {
  function Table(linesInfos) {
    _classCallCheck(this, Table);

    this._parts = [];
    this._linesInfos = linesInfos;
    this.addPart();
  }

  _createClass(Table, [{
    key: 'lastPart',
    value: function lastPart() {
      return this._parts[this._parts.length - 1];
    }
  }, {
    key: 'addPart',
    value: function addPart() {
      this._parts.push(new TablePart(this._linesInfos));
    }
  }]);

  return Table;
}();

var TablePart = function () {
  function TablePart(linesInfos) {
    _classCallCheck(this, TablePart);

    this._rows = [];
    this._linesInfos = linesInfos;
    this.addRow();
  }

  _createClass(TablePart, [{
    key: 'addRow',
    value: function addRow() {
      this._rows.push(new TableRow(this._linesInfos));
    }
  }, {
    key: 'removeLastRow',
    value: function removeLastRow() {
      this._rows.pop();
    }
  }, {
    key: 'lastRow',
    value: function lastRow() {
      return this._rows[this._rows.length - 1];
    }
  }, {
    key: 'updateWithMainLine',
    value: function updateWithMainLine(line, isEndLine) {
      // Update last row according to a line.
      var mergeChars = isEndLine ? '+|' : '|';
      var newCells = [this.lastRow()._cells[0]];
      for (var c = 1; c < this.lastRow()._cells.length; ++c) {
        var cell = this.lastRow()._cells[c];

        // Only cells with rowspan equals can be merged
        // Test if the char before the cell is a separation character
        if (cell._rowspan === newCells[newCells.length - 1]._rowspan && !mergeChars.includes(line[cell._startPosition - 1])) {
          newCells[newCells.length - 1].mergeWith(cell);
        } else {
          newCells.push(cell);
        }
      }
      this.lastRow()._cells = newCells;
    }
  }, {
    key: 'updateWithPartLine',
    value: function updateWithPartLine(line) {
      // Get cells not finished
      var remainingCells = [];
      for (var c = 0; c < this.lastRow()._cells.length; ++c) {
        var cell = this.lastRow()._cells[c];
        var partLine = line.substring(cell._startPosition - 1, cell._endPosition + 1);
        if (!isSeparationLine(partLine)) {
          cell._lines.push(line.substring(cell._startPosition, cell._endPosition));
          cell._rowspan += 1;
          remainingCells.push(cell);
        }
      }
      // Generate new row
      this.addRow();
      var newCells = [];
      for (var _c = 0; _c < remainingCells.length; ++_c) {
        var remainingCell = remainingCells[_c];
        for (var cc = 0; cc < this.lastRow()._cells.length; ++cc) {
          var _cell = this.lastRow()._cells[cc];
          if (_cell._endPosition < remainingCell._startPosition && !newCells.includes(_cell)) {
            newCells.push(_cell);
          }
        }
        newCells.push(remainingCell);
        for (var _cc = 0; _cc < this.lastRow()._cells.length; ++_cc) {
          var _cell2 = this.lastRow()._cells[_cc];
          if (_cell2._startPosition > remainingCell._endPosition && !newCells.includes(_cell2)) {
            newCells.push(_cell2);
          }
        }
      }

      // Remove duplicates
      for (var nc = 0; nc < newCells.length; ++nc) {
        var newCell = newCells[nc];
        for (var ncc = 0; ncc < newCells.length; ++ncc) {
          if (nc !== ncc) {
            var other = newCells[ncc];
            if (other._startPosition >= newCell._startPosition && other._endPosition <= newCell._endPosition) {
              if (other._lines.length === 0) {
                newCells.splice(ncc, 1);
                ncc -= 1;
                if (nc > ncc) {
                  nc -= 1;
                  newCell = newCells[nc];
                }
              }
            }
          }
        }
      }
      this.lastRow()._cells = newCells;
    }
  }]);

  return TablePart;
}();

var TableRow = function () {
  function TableRow(linesInfos) {
    _classCallCheck(this, TableRow);

    this._linesInfos = linesInfos;
    this._cells = [];
    for (var i = 0; i < linesInfos.length - 1; ++i) {
      this._cells.push(new TableCell(linesInfos[i] + 1, linesInfos[i + 1]));
    }
  }

  _createClass(TableRow, [{
    key: 'updateContent',
    value: function updateContent(line) {
      for (var c = 0; c < this._cells.length; ++c) {
        var cell = this._cells[c];
        cell._lines.push(line.substring(cell._startPosition, cell._endPosition));
      }
    }
  }]);

  return TableRow;
}();

var TableCell = function () {
  function TableCell(startPosition, endPosition) {
    _classCallCheck(this, TableCell);

    this._startPosition = startPosition;
    this._endPosition = endPosition;
    this._colspan = 1;
    this._rowspan = 1;
    this._lines = [];
  }

  _createClass(TableCell, [{
    key: 'mergeWith',
    value: function mergeWith(other) {
      this._endPosition = other._endPosition;
      this._colspan += other._colspan;
      var newLines = [];
      for (var l = 0; l < this._lines.length; ++l) {
        newLines.push(this._lines[l] + '|' + other._lines[l]);
      }
      this._lines = newLines;
    }
  }]);

  return TableCell;
}();

function merge(beforeTable, gridTable, afterTable) {
  // get the eaten text
  var total = beforeTable.join('\n');
  if (total.length) {
    total += '\n';
  }
  total += gridTable.join('\n');
  if (afterTable.join('\n').length) {
    total += '\n';
  }
  total += afterTable.join('\n');
  return total;
}

function isSeparationLine(line) {
  return separationLineRegex.exec(line);
}

function isHeaderLine(line) {
  return headerLineRegex.exec(line);
}

function isPartLine(line) {
  return partLineRegex.exec(line);
}

function findAll(content, characters) {
  var pos = [];
  for (var i = 0; i < content.length; ++i) {
    var char = content[i];
    if (characters.includes(char)) {
      pos.push(i);
    }
  }
  return pos;
}

function computePlainLineColumnsStartingPositions(line) {
  return findAll(line, '+|');
}

function mergeColumnsStartingPositions(allPos) {
  // Get all starting positions, allPos is an array of array of positions
  var positions = [];

  allPos.forEach(function (posRow) {
    return posRow.forEach(function (pos) {
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    });
  });

  return positions.sort(function (a, b) {
    return a - b;
  });
}

function computeColumnStartingPositions(lines) {
  var linesInfo = [];

  lines.forEach(function (line) {
    if (isHeaderLine(line) || isPartLine(line)) {
      linesInfo.push(computePlainLineColumnsStartingPositions(line));
    }
  });

  return mergeColumnsStartingPositions(linesInfo);
}

function extractTable(value, eat, tokenizer) {
  // Extract lines before the grid table
  var possibleGridTable = value.split('\n');
  var i = 0;
  var before = [];
  for (; i < possibleGridTable.length; ++i) {
    var line = possibleGridTable[i];
    if (isSeparationLine(line)) break;
    if (line.length === 0) break;
    before.push(line);
  }

  // Extract table
  if (!possibleGridTable[i + 1]) return [null, null, null, null];
  var lineLength = possibleGridTable[i + 1].length;
  var gridTable = [];
  var hasHeader = false;
  for (; i < possibleGridTable.length; ++i) {
    var _line = possibleGridTable[i];
    var isMainLine = totalMainLineRegex.exec(_line);
    // line is in table
    if (isMainLine && _line.length === lineLength) {
      var _isHeaderLine = headerLineRegex.exec(_line);
      if (_isHeaderLine && !hasHeader) hasHeader = true;
      // A table can't have 2 headers
      else if (_isHeaderLine && hasHeader) {
          break;
        }
      gridTable.push(_line);
    } else {
      // this line is not in the grid table.
      break;
    }
  }

  // if the last line is not a plain line
  if (!separationLineRegex.exec(gridTable[gridTable.length - 1])) {
    // Remove lines not in the table
    for (var j = gridTable.length - 1; j >= 0; --j) {
      var isSeparation = separationLineRegex.exec(gridTable[j]);
      if (isSeparation) break;
      gridTable.pop();
      i -= 1;
    }
  }

  // Extract lines after table
  var after = [];
  for (; i < possibleGridTable.length; ++i) {
    var _line2 = possibleGridTable[i];
    if (_line2.length === 0) break;
    after.push(_line2);
  }

  return [before, gridTable, after, hasHeader];
}

function extractTableContent(lines, linesInfos, hasHeader) {
  var table = new Table(linesInfos);

  for (var l = 0; l < lines.length; ++l) {
    var line = lines[l];
    // Get if the line separate the head of the table from the body
    var matchHeader = hasHeader & isHeaderLine(line) !== null;
    // Get if the line close some cells
    var isEndLine = matchHeader | isPartLine(line) !== null;

    if (isEndLine) {
      // It is a header, a plain line or a line with plain line part.
      // First, update the last row
      table.lastPart().updateWithMainLine(line, isEndLine);

      // Create the new row
      if (l !== 0) {
        if (matchHeader) {
          table.addPart();
        } else if (isSeparationLine(line)) {
          table.lastPart().addRow();
        } else {
          table.lastPart().updateWithPartLine(line);
        }
      }
      // update the last row
      table.lastPart().updateWithMainLine(line, isEndLine);
    } else {
      // it's a plain line
      table.lastPart().updateWithMainLine(line, isEndLine);
      table.lastPart().lastRow().updateContent(line);
    }
  }
  // Because the last line is a separation, the last row is always empty
  table.lastPart().removeLastRow();
  return table;
}

function generateTable(tableContent, now, tokenizer) {
  // Generate the gridTable node to insert in the AST
  var tableElt = {
    type: 'gridTable',
    children: [],
    data: {
      hName: 'table'
    }
  };

  var hasHeader = tableContent._parts.length > 1;

  for (var p = 0; p < tableContent._parts.length; ++p) {
    var part = tableContent._parts[p];
    var partElt = {
      type: 'tableHeader',
      children: [],
      data: {
        hName: hasHeader && p === 0 ? 'thead' : 'tbody'
      }
    };
    for (var r = 0; r < part._rows.length; ++r) {
      var row = part._rows[r];
      var rowElt = {
        type: 'tableRow',
        children: [],
        data: {
          hName: 'tr'
        }
      };
      for (var c = 0; c < row._cells.length; ++c) {
        var cell = row._cells[c];
        var cellElt = {
          type: 'tableCell',
          children: tokenizer.tokenizeBlock(cell._lines.map(function (e) {
            return e.trim();
          }).join('\n'), now),
          data: {
            hName: hasHeader && p === 0 ? 'th' : 'td',
            hProperties: {
              colspan: cell._colspan,
              rowspan: cell._rowspan
            }
          }
        };

        var endLine = r + cell._rowspan;
        if (cell._rowspan > 1 && endLine - 1 < part._rows.length) {
          for (var rs = 1; rs < cell._rowspan; ++rs) {
            for (var cc = 0; cc < part._rows[r + rs]._cells.length; ++cc) {
              var other = part._rows[r + rs]._cells[cc];
              if (cell._startPosition === other._startPosition && cell._endPosition === other._endPosition && cell._colspan === other._colspan && cell._rowspan === other._rowspan && cell._lines === other._lines) {
                part._rows[r + rs]._cells.splice(cc, 1);
              }
            }
          }
        }

        rowElt.children.push(cellElt);
      }
      partElt.children.push(rowElt);
    }
    tableElt.children.push(partElt);
  }

  return tableElt;
}

function gridTableTokenizer(eat, value, silent) {
  var keep = mainLineRegex.exec(value);
  if (!keep) return;

  var _extractTable = extractTable(value, eat, this),
      _extractTable2 = _slicedToArray(_extractTable, 4),
      before = _extractTable2[0],
      gridTable = _extractTable2[1],
      after = _extractTable2[2],
      hasHeader = _extractTable2[3];

  if (!gridTable || gridTable.length < 3) return;

  var now = eat.now();
  var linesInfos = computeColumnStartingPositions(gridTable);
  var tableContent = extractTableContent(gridTable, linesInfos, hasHeader);
  var tableElt = generateTable(tableContent, now, this);
  var merged = merge(before, gridTable, after);

  // Because we can't add multiples blocs in one eat, I use a temp block
  var wrapperBlock = {
    type: 'element',
    tagName: 'WrapperBlock',
    children: []
  };
  if (before.length) {
    wrapperBlock.children.push(this.tokenizeBlock(before.join('\n'), now)[0]);
  }
  wrapperBlock.children.push(tableElt);
  if (after.length) {
    wrapperBlock.children.push(this.tokenizeBlock(after.join('\n'), now)[0]);
  }
  return eat(merged)(wrapperBlock);
}

function deleteWrapperBlock() {
  function one(node, index, parent) {
    if (!node.children) return;

    var newChildren = [];
    var replace = false;
    for (var c = 0; c < node.children.length; ++c) {
      var child = node.children[c];
      if (child.tagName === 'WrapperBlock' && child.type === 'element') {
        replace = true;
        for (var cc = 0; cc < child.children.length; ++cc) {
          newChildren.push(child.children[cc]);
        }
      } else {
        newChildren.push(child);
      }
    }
    if (replace) {
      node.children = newChildren;
    }
  }
  return one;
}

function transformer(tree) {
  // Remove the temporary block in which we previously wrapped the table parts
  visit(tree, deleteWrapperBlock());
}

function plugin() {
  var Parser = this.Parser;

  // Inject blockTokenizer
  var blockTokenizers = Parser.prototype.blockTokenizers;
  var blockMethods = Parser.prototype.blockMethods;
  blockTokenizers.grid_table = gridTableTokenizer;
  blockMethods.splice(blockMethods.indexOf('fencedCode') + 1, 0, 'grid_table');

  return transformer;
}