function App() {
  
  var bgColor = "#202020"
  var openColor = ["#d07070", "#d06060", "#d05050", "#d04040", "#d03030", "#d02020", "#d01010", "#a00000"];
  var victoryColor = "#70ff70";
  var white = "#ffffff";
  var defHexColor = white;
  var borderColor = "#ff0000";
  var textColor = "#000000";
  var hexColor = white;
  var mineRatio = 0.15;
  var smallFont = "12px Segoe UI";
  var largeFont = "96px Segoe UI";
  var sqrt3per2 = 0.86602540378;
  
  function DrawHex(hex, radius) {
    function innerDraw(ctx) {
      var corners = hex.GetCorners();
      ctx.moveTo(x + corners[0][0], y + corners[0][1]);
      
      for (var i = 1; i < corners.length; i++) {
        ctx.lineTo(x + corners[i][0], y + corners[i][1]);
      }   
    }
    
    var x = hex.pos.x;
    var y = hex.pos.y;
    
    ctx = GetContext();
    
    // First draw the filled hex
    ctx.fillStyle = hexColor;
    if (hex.open) {
      if (hex.mine) {
        ctx.fillStyle = openColor[7];
      } else {
        ctx.fillStyle = openColor[hex.neighborMines];      
      }
    } 
    ctx.beginPath();
    innerDraw(ctx);
    ctx.closePath();
    ctx.fill();
    
    // Then the border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = "2";
    innerDraw(ctx);
    ctx.stroke();
   
    text = "";
    if (hex.open) {
      if (hex.mine) {
        text = "M";
      } else {
        if (hex.neighborMines > 0) {
          text = hex.neighborMines;
        }
      }
    } else if (hex.marked) {
      text = "X";
    }
    NormalText(text, x-3, y+4, smallFont, textColor);
  }
  
  function StrokeText(text, posx, posy, font, color) {
    NormalText(text, posx, posy, font, color);
    ctx.strokeStyle = "#000000";
    ctx.strokeText(text, posx, posy);
  }
  
  function NormalText(text, posx, posy, font, color) {
    var ctx = GetContext();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, posx, posy);
  }
  
  function SqrDist(coords1, coords2) {
    return Math.pow(coords1.x - coords2.x, 2) + Math.pow(coords1.y - coords2.y, 2);
  }
  
  function Hex(pos, index, radius) {
    this.pos = pos;
    this.index = index;
    this.radius = radius;
    this.mine = false;
    this.open = false;
    this.visited = false;
    this.marked = false;    
    
    function IsInsideTriangle(coord, a, b) {
      // a and b span a triangle. See if coord is inside it by using barycentric coordinates.
      
      var invDenom = 1.0 / (a[1] * b[0] - a[0] * b[1]);
      
      var u = (coord[0] * a[1] - coord[1] * a[0]) * invDenom;
      
      if (u < 0) {
        return false;
      }
      
      var v = (coord[1] * b[0] - coord[0] * b[1]) * invDenom; 
      
      if (v < 0) {
        return false;
      }
      
      if (u + v > 1.0) {
        return false;
      }
      
      return true;
    }
  
    this.GetCorners = function() {
      var height = sqrt3per2 * radius;
      return [
        [radius, 0.0],
        [0.5 * radius, height],
        [-0.5 * radius, height],
        [-radius, 0.0],
        [-0.5 * radius, -height],
        [0.5 * radius, -height],
        [radius, 0.0]
      ];
    }
    
    this.Contains = function(coord) {
      if (SqrDist(this.pos, coord) < radius*radius) {
        var trans = [coord.x - pos.x, coord.y - pos.y]; // at origin
        var corners = this.GetCorners();
        
        for (var i = 0; i < corners.length-1; i++) {
          if (IsInsideTriangle(trans, corners[i], corners[i+1])) {
            return true;
          }
        }
      }
      return false;
    }
    
    return this;
  }
  
  function for_each(list, func) {
    for (var i = 0; i < list.length; i++) {
      func(list[i]);
    }
  }
  
  function HexGrid(w, h, res, pos) {
    var height = h;
    var width = w;
    var resolution = res;
    
    var position = pos;
    
    this.StartGame = function() {
      InitHexes();
      
      InitMines();
      
      CountMines();
      
      this.gameover = false;
      this.victory = false;
      hexColor = defHexColor;
      Draw();
    }
    
    this.Demo = function() {
      function TryFindOpenableHex() {
        // Find a hex that has enough neighors marked so that it can be safely opened
        for (var i = 0; i < this.hexes.length; i++) {
          var hex = this.hexes[i];
          
          if (hex.open) {
            var neibs = GetNeighbors(hex);
            
            var closed = GetNeighbors(hex, function(hex) { return !hex.open; }).length;
            var marked = GetNeighbors(hex, function(hex) { return hex.marked; }).length;
            
            if (marked == hex.neighborMines) {
              if (closed > marked) {
                for (var j = 0; j < neibs.length; j++) {
                  if (!neibs[j].open && !neibs[j].marked) {
                    return function() { ClickLeft(neibs[j]); Draw();};
                  }
                }
              }
            }
          }
        }
      }
      
      function TryFindMarkableHexes() {
        // Mark hexes that are certain to contain mines
        for (var i = 0; i < this.hexes.length; i++) {
          var hex = this.hexes[i];
          if (hex.open) {
            
            var neibs = GetNeighbors(hex);
            
            var marked = GetNeighbors(hex, function(hex) { return hex.marked; }).length
            
            if (marked == hex.neighborMines) {
              continue;
            }
            
            var closed = GetNeighbors(hex, function(hex) { return !hex.open; }).length
            
            if (closed == hex.neighborMines) {
              return function() {
                for (var j = 0; j < neibs.length; j++) {
                  if (!neibs[j].open && !neibs[j].marked) {
                    ClickRight(neibs[j]);
                  }
                }
                Draw(); 
              };
            }
          }
        }
      }
      
      function OpenRandomNonMarkedHex() {
        // Find random closed hex to click
        var closed = [];
        var action;
        for (var i = 0; i < this.hexes.length; i++) {
          if (!this.hexes[i].open && !this.hexes[i].marked) {
            closed.push(this.hexes[i]);
          }
        }
        
        console.log("Selecting randomly from " + closed.length + " hexes..");
        
        var randhex = closed[Math.floor(Math.random() * closed.length)];
        return function() { ClickLeft(randhex); Draw();};
      }
      
      if (this.victory || this.gameover) {
        return;
      }
      
      var action = TryFindOpenableHex();
      
      if (action == undefined) {
        action = TryFindMarkableHexes();
      }

      if (action == undefined) {
        action = OpenRandomNonMarkedHex();
      }
      
      setTimeout(action, 50);
    
      setTimeout(function() { this.Demo(); }, 50);
    }
    
    function InitHexes() {
      this.hexes = [];
      var ind = 0;
      var curX = position.x;
      for (var x = 0; x < width; x++) {
        var curY = position.y;
        for (var y = 0; y < height; y++) {
          var offSet = 0;
          if ((x % 2) == 1) {
             offSet = resolution * sqrt3per2;
          }
          
          this.hexes.push(new Hex({x: curX, y: curY + offSet}, ind, resolution));
          curY += resolution * sqrt3per2 * 2;  
          ind++;
        }
        curX += 1.5 * resolution;
      }
    }
    
    function InitMines() {
      var mineCount = TotalMineCount();
      var mines = [];
      for (var i = 0; i < this.hexes.length; i++) {
        var hexesRemaining = this.hexes.length - i;
        var minesRemaining = mineCount - mines.length;
        if (minesRemaining == 0) {
          break;
        }
        if (Math.random() < minesRemaining / hexesRemaining) {
          mines.push(i);
        }
      }
      
      for (var i = 0; i < mines.length; i++) {
        this.hexes[mines[i]].mine = true;
      }
    }
    
    function CountMines() {
      for (var i = 0; i < this.hexes.length; i++) {
        var mineCount = GetNeighbors(this.hexes[i], function(hex) { return hex.mine; }).length;
        this.hexes[i].neighborMines = mineCount;
      }
    }
    
    function TotalMineCount() {
      return Math.floor(mineRatio * width * height);
    }
    
    function Draw() {
      if (this.victory) {
        hexColor = victoryColor;
      }
      
      GetContext().clearRect(0, 0, GetCanvas().width, GetCanvas().height);
      
      for (var i = 0; i < this.hexes.length; i++) {
        DrawHex(hexes[i], resolution);
      }
  
      if (this.gameover || this.victory) {
        victoryTexts = ["Great!", "Amazing!", "Congratulations!", "YEAH!", "Good Job!", "Well done!", "Lucky!", "Allright!", "Woot woot!"];
        loseTexts = ["Aww..", "Too bad!", "Damn!", "Knew it!", "You lose.", "*BOOM*", "Watch out!", "Loser :)"];
        
        var winneR = Math.floor(Math.random() * victoryTexts.length);
        var loseR = Math.floor(Math.random() * loseTexts.length);
        
        var text = this.gameover ? loseTexts[loseR] : victoryTexts[winneR];
        
        StrokeText(text, 70, 200, largeFont, white)
        StrokeText("Press R to restart.", 70, 400, largeFont, white);
      }
      
      NormalText(Math.max(0, TotalMineCount() - MarkedHexes()), 30, 10, smallFont, white); // don't go below zero
    }
    
    function MarkedHexes() {
      var marked = 0;
      for (var i = 0; i < this.hexes.length; i++) {
        if (this.hexes[i].marked) {
          marked++;
        }
      }
      return marked;
    }
    
    function GetNeighbors(current, cond) {
      
      if (cond == undefined) {
        cond = function(hex) { return true; };
      }
      
      neighbors = [];
      var index = current.index;
      var row = (index % height);
      var col = (index - (index % height)) / height;
    
      if (row > 0) {
        neighbors.push(this.hexes[index - 1]);
      }
      
      if (row < height - 1) {
        neighbors.push(this.hexes[index + 1]);
      }
  
      if (col > 0) {
        neighbors.push(this.hexes[index - height]);
        
        if (col % 2 == 1) {
          if (row < height - 1) {
            neighbors.push(this.hexes[index - height + 1]);
          }
        } else {
          if (row > 0) {
            neighbors.push(this.hexes[index - height - 1]);
          }
        }
      }
      
      if (col < width - 1) {
        neighbors.push(this.hexes[index + height]);
        
        if (col % 2 == 1) {
          if (row < height - 1) {
            neighbors.push(this.hexes[index + height + 1]);
          }
        } else {
          if (row > 0) {
            neighbors.push(this.hexes[index + height - 1]);
          }
        }
      }
     
      var ret = [];
      for (var i = 0; i < neighbors.length; i++) {
        if (cond(neighbors[i])) {
          ret.push(neighbors[i]);
        }
      }
     
      return ret;
    }
    
    function FindHex(coords) {
      for (var i = 0; i < this.hexes.length; i++) {
        var hex = this.hexes[i];
        if (hex.Contains(coords)) {
          return hex;
        }
      }
    }
    
    function ClickRight(hit) {
      if (hit.open) {
        if (LeftMousePressed()) {
          HandleBothPressed(); 
        }
      } else {
        hit.marked = !hit.marked;
      }
    }
    
    function ClickLeft(hit) {
      if (hit.open) {
        if (RightMousePressed()) {
          HandleBothPressed(hit);
        }
      } else {
        OpenHex(hit);
      }
    }
    
    function GameOver() {
      for_each(this.hexes, function(hex) { hex.open = true});
      
      this.gameover = true;
      this.victory = false;
    }
    
    function EmptyClicked(empty) {
      empty.visited = true;
      var queue = [empty];
      var result = [];
      while (queue.length > 0) { // BFS
        var next = queue.pop();
        result.push(next);
        var list = GetNeighbors(next);
        for (var i = 0; i < list.length; i++) {
          var neib = list[i];
          if (neib.neighborMines == 0 && !neib.visited) {
            neib.visited = true;
            queue.push(neib);
          }
        }
      }
      
      for_each(result, function (res_hex) {
        neibs = GetNeighbors(res_hex);
        for_each(neibs, function (neib_hex) { neib_hex.open = true; });
      });
      
      for_each(this.hexes, function(hex) { hex.visited = false; });
      
    }
    
    function CheckVictory() {
      if (!this.gameover) { // Victory condition
        onlyMinesClosed = true;
        for (var i = 0; i < this.hexes.length; i++) {
          if (!this.hexes[i].open) {
            if (!this.hexes[i].mine) {
              onlyMinesClosed = false;
            }
          }
        }
        
        if (onlyMinesClosed) {
          this.victory = true;
        }
      }
    }
    
    var mouseButtonsDown = [];
    
    this.OnMouseDown = function(coords, button) {
      mouseButtonsDown[button] = true;
      var hit = FindHex(coords);
      
      if (hit == undefined) {
        return;
      }
      
      if (this.victory || this.gameover) {
        return false;
      }
      
      if (button == 1 ) {
        ClickLeft(hit);
      } else if (button == 3) {
        ClickRight(hit);
      }
      
      Draw();
      
    }
    
    this.OnMouseUp = function(button) {
      mouseButtonsDown[button] = false;
    }
    
    function RightMousePressed() {
      return mouseButtonsDown[3];
    }
    
    function LeftMousePressed() {
      return mouseButtonsDown[1];
    }
    
    function HandleBothPressed(hit) {
      
      if (hit.open) {
        
        var neibsMarked = GetNeighbors(hit, function (hex) { return hex.marked; }).length;
        
        if (neibsMarked == hit.neighborMines) {
          var nonMarked = GetNeighbors(hit, function(hex) { return !hex.marked; });
          for_each(nonMarked, function(hex) {OpenHex(hex)});
        }
      }
    }
    
    function OpenHex(hit) {
      if (!hit.open) {
        hit.open = true;
        hit.marked = false;
        if (hit.mine) {
          GameOver();
        } else if (hit.neighborMines == 0) {
          EmptyClicked(hit);
        }
        CheckVictory();
      }
    }
    return this;
  }
  
  function GetContext() {
    return GetCanvas().getContext("2d");
  }
  
  function GetCanvas() {
    return document.getElementById("canvas");
  }
  
  this.Start = function() {
    GetCanvas().onmousedown = OnMouseDownCB;
    GetCanvas().onmouseup = OnMouseUpCB;
    GetCanvas().style.backgroundColor = bgColor;
    document.onkeydown = OnKey;
    document.body.style.backgroundColor = bgColor;
    this.hg = HexGrid(26, 18, 20, { x: 40, y: 40});
    StartGame();
  }
  
  function StartGame() {
    this.hg.StartGame();
  }
  
  function Demo() {
    this.hg.Demo();
  }
  
  function ScreenToCanvas(sx, sy) {
    rect = GetCanvas().getBoundingClientRect();
    return { x: sx - rect.left, y: sy - rect.top };
  }
  
  function OnKey(ev) {
    if (ev.keyCode == 82) {
      StartGame();
    }
    
    if (ev.keyCode == 68) {
      Demo();
    }
  }
  
  function OnMouseDown(coords, button) {
    this.hg.OnMouseDown(coords, button);
  }
  
  function OnMouseUp(button) {
    this.hg.OnMouseUp(button);
  }
  
  function OnMouseDownCB(ev) {
    x = ev.clientX;
    y = ev.clientY;
    canv = ScreenToCanvas(ev.clientX, ev.clientY);
    OnMouseDown(canv, ev.which);
  }
  
  function OnMouseUpCB(ev) {
    OnMouseUp(ev.which);
  }
  
  return this;
}