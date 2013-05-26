function App() {
  
  var bgColor = "#202020"
  var openColor = ["#7070d0", "#6060d0", "#5050d0", "#4040d0", "#3030d0", "#2020d0", "#1010d0", "#a00000"];
  var victoryColor = "#70ff70";
  var white = "#ffffff";
  var defHexColor = white;
  var borderColor = "#0000ff";
  var textColor = "#000000";
  var hexColor = white;
  var smallFont = "12px Segoe UI";
  var largeFont = "bold 96px Segoe UI";
  var sqrt3per2 = 0.86602540378;
  
  function SliderControl(pos) {

    this.val = 0.15;
    var width = 100;
    var height = 10;
    var knobHeight = 30;
    var knobWidth = 10;
    this.position = pos;
    var dragging = false;
    var that = this;
    
    this.Draw = function() {
      var ctx = GetContext();
      var bb = BoundingBox();
      ctx.clearRect(bb.x, bb.y, bb.w, bb.h);
      
      ctx.fillStyle = "grey";
      var main = MainBox();
      ctx.fillRect(main.x, main.y, main.w, main.h);
      
      ctx.fillStyle = "white";
      var knobBox = KnobBox();
      ctx.fillRect(knobBox.x, knobBox.y, knobBox.w, knobBox.h);
      NormalText(this.val.toFixed(2), knobBox.x - 2, knobBox.y - 5, smallFont, "white");
    }
    
    function BoundingBox() {
      return {
        x: that.position.x - knobWidth,
        y: KnobBox().y - 20,
        w: width + 3 * knobWidth,
        h: knobHeight + 20
      }
    }
    
    function MainBox() {
      return {
        x: that.position.x, 
        y: that.position.y,
        w: width,
        h: height
      };
    }
    
    function KnobBox() {
      return { 
        x: that.val * width + pos.x - knobWidth * 0.5, 
        y: that.position.y - knobHeight * 0.5 + height * 0.5, 
        w: knobWidth, 
        h: knobHeight 
      };
    }
    
    function BoxContains(box, coords) {
      return coords.x >= box.x && 
        coords.x <= box.x + box.w &&
        coords.y >= box.y &&
        coords.y <= box.y + box.h;
    }
    
    this.Contains = function(coords) {
      return BoxContains(KnobBox(), coords) || BoxContains(MainBox(), coords);
    }
    
    this.OnMouseDown = function(coords, button) {
      if (button == 3) {
        return;
      }
      
      if (BoxContains(KnobBox(), coords)) {
        dragging = true;
      } else if(BoxContains(MainBox(), coords)) {
        SetValAtCoord(coords);
        dragging = true;
        this.Draw(); 
      }
    }
    
    this.OnMouseUp = function() {
      dragging = false;
    }
    
    function SetValAtCoord(coords) {
      var coordx = coords.x - that.position.x;
      coordx = Math.max(0, coordx);
      coordx = Math.min(width, coordx);
      that.val = coordx / width;
    }
    
    this.OnMouseMove = function(coords) {
      if (dragging) {
        SetValAtCoord(coords);
        this.Draw();
      }
    }
    
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
  
  function FilledCircle(posx, posy, radius, color) {
    var ctx = GetContext();
    ctx.beginPath();
    var counterClockwise = false;
    ctx.arc(posx, posy, radius, 0, 2 * Math.PI, counterClockwise);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  
  function SqrDist(coords1, coords2) {
    return Math.pow(coords1.x - coords2.x, 2) + Math.pow(coords1.y - coords2.y, 2);
  }
  
  function Hex(pos, index, radius) {
    var pos = pos;
    this.index = index;
    var radius = radius;
    this.mine = false;
    var open = false;
    this.visited = false;
    var marked = false;
    var redraw = true;
    
    this.Open = function() {
      open = true;
      redraw = true;
    }
    
    this.IsOpen = function() {
      return open;
    }
    
    this.ToggleMark = function() {
      marked = !marked;
      redraw = true;
    }
    
    this.IsMarked = function() {
      return marked;
    }
    
    this.ReDraw = function() {
      redraw = true;
    }
        
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
      if (SqrDist(pos, coord) < radius*radius) {
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
    
    this.Draw = function() {
      
      if (!redraw) {
        return;
      }
      
      var corners = this.GetCorners();
      function innerDraw(ctx) {
        ctx.moveTo(x + corners[0][0], y + corners[0][1]);
        
        for (var i = 1; i < corners.length; i++) {
          ctx.lineTo(x + corners[i][0], y + corners[i][1]);
        }   
      }
      
      var x = pos.x;
      var y = pos.y;
      
      ctx = GetContext();
      
      // First draw the filled hex
      ctx.fillStyle = hexColor;
      if (open) {
        if (this.mine) {
          ctx.fillStyle = openColor[7];
        } else {
          ctx.fillStyle = openColor[this.neighborMines];      
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
           
      var HexText = function(text) {        
        return NormalText(text, x-3, y+4, smallFont, textColor);
      }
      
      if (open) {
        if (!this.mine) {
          if (this.neighborMines > 0) {
            HexText(this.neighborMines);
          }
        }
      } else if (marked) {
        HexText("X");
      }
      redraw = false;
    }
    
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
    
    this.slider = new SliderControl({x: 700, y: 25});
    this.gameover = false;
    this.victory = false;
    
    var wintext = "";
    var losetext = "";
    
    var that = this;
    
    this.InitGame = function() {
      InitHexes();
      
      InitMines();
            
      hexColor = defHexColor;
      
      this.gameover = false;
      this.victory = false;
      
      victoryTexts = ["Great!", "Amazing!", "Congratulations!", "YEAH!", "Good Job!", "Well done!", "Lucky!", "Allright!", "Woot woot!"];
      loseTexts = ["Aww..", "Too bad!", "Damn!", "Knew it!", "You lose.", "*BOOM*", "Watch out!", "Loser :)"];
        
      var winneR = Math.floor(Math.random() * victoryTexts.length);
      var loseR = Math.floor(Math.random() * loseTexts.length);
      
      wintext = victoryTexts[winneR];
      losetext = loseTexts[loseR];
      
      Draw();
    }
    
    this.Demo = function() {
      function TryFindOpenableHex() {
        // Find a hex that has enough neighors marked so that it can be safely opened
        for (var i = 0; i < that.hexes.length; i++) {
          var hex = that.hexes[i];
          
          if (hex.IsOpen()) {
            var neibs = GetNeighbors(hex);
            
            var closed = GetNeighbors(hex, function(hex) { return !hex.IsOpen(); }).length;
            var marked = GetNeighbors(hex, function(hex) { return hex.IsMarked(); }).length;
            
            if (marked == hex.neighborMines) {
              if (closed > marked) {
                for (var j = 0; j < neibs.length; j++) {
                  if (!neibs[j].IsOpen() && !neibs[j].IsMarked()) {
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
        for (var i = 0; i < that.hexes.length; i++) {
          var hex = that.hexes[i];
          if (hex.IsOpen()) {
            
            var neibs = GetNeighbors(hex);
            
            var marked = GetNeighbors(hex, function(hex) { return hex.IsMarked(); }).length
            
            if (marked == hex.neighborMines) {
              continue;
            }
            
            var closed = GetNeighbors(hex, function(hex) { return !hex.IsOpen(); }).length
            
            if (closed == hex.neighborMines) {
              return function() {
                for (var j = 0; j < neibs.length; j++) {
                  if (!neibs[j].IsOpen() && !neibs[j].IsMarked()) {
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
        var closed = that.hexes.filter(function(hex) { return !hex.IsOpen() && !hex.IsMarked();})
        
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
    
      setTimeout(function() { that.Demo(); }, 50);
    }
    
    function InitHexes() {
      that.hexes = [];
      var ind = 0;
      var curX = position.x;
      for (var x = 0; x < width; x++) {
        var curY = position.y;
        for (var y = 0; y < height; y++) {
          var offSet = 0;
          if ((x % 2) == 1) {
             offSet = resolution * sqrt3per2;
          }
          
          that.hexes.push(new Hex({x: curX, y: curY + offSet}, ind, resolution));
          curY += resolution * sqrt3per2 * 2;  
          ind++;
        }
        curX += 1.5 * resolution;
      }
    }
    
    function InitMines() {
      var mineCount = TotalMineCount();
      var mines = [];
      var nonMines = [];
      for (var i = 0; i < that.hexes.length; i++) {
        var hexesRemaining = that.hexes.length - i;
        var minesRemaining = mineCount - mines.length;
        if (Math.random() < minesRemaining / hexesRemaining) {
          mines.push(i);
        } else {
          nonMines.push(i);
        }
      }
      
      for_each(mines, function(index) { that.hexes[index].mine = true; });
      for_each(nonMines, function(index) { that.hexes[index].mine = false; });
      
      for_each(that.hexes, function(curhex) {
        var mineCount = GetNeighbors(curhex, function(hex) { return hex.mine; }).length;
        curhex.neighborMines = mineCount;
      });
    }

    function TotalMineCount() {
      return Math.floor(GetMineRatio() * width * height);
    }
    
    var mineRatio;
    
    function GetMineRatio() {
      if (!GameInProgress()) { // Update only when game not in progress
        mineRatio = that.slider.val;
      }
      return mineRatio;
    }
    
    function DrawHexes() {
    //  var timeNow = new Date().getTime();
      for (var i = 0; i < that.hexes.length; i++) {
        var time = new Date().getTime();
      
      /*  if (time - timeNow > 10) {
          setTimeout(DrawHexes, 0);
          return;
        }*/
      
        that.hexes[i].Draw();
      }
      setTimeout(DrawOverlay, 0);
    }
    
    function DrawOverlay() {
      GetContext().clearRect(0, 0, GetCanvas().width, 60);
      if (that.gameover || that.victory) {
        
        var text = that.gameover ? losetext : wintext;
        
        StrokeText(text, 50, 200, largeFont, white)
        if (that.victory) {
          var gameLenStr = "";
          var gameLen = that.gametime;
          if (gameLen >= 60) {
            var mins = Math.floor(gameLen / 60);
            gameLenStr = mins + ":";
            gameLen -= mins * 60;
          }
          
          gameLenStr = gameLenStr + gameLen.toFixed(2) + ".";
          StrokeText("Time: " + gameLenStr, 50, 400, largeFont, white);
        }
        StrokeText("Click to restart.", 50, 600, largeFont, white);
      }

      if (!GameInProgress()) {
        that.slider.Draw();
      } else {
        NormalText(that.slider.val.toFixed(2), that.slider.position.x, that.slider.position.y + 8, smallFont, white);
      }
      
      NormalText("Mine ratio: ", that.slider.position.x - 70, that.slider.position.y + 8, smallFont, white);
      
      NormalText("Flagged: " + MarkedHexes(), 30, 10, smallFont, white);
      NormalText("Total: " + TotalMineCount(), 30, 30, smallFont, white);
    }
    
    function Draw() {
      if (that.victory) {
        hexColor = victoryColor;
      }
      
      DrawHexes();
    }
    
    function MarkedHexes() {
      return that.hexes.filter(function(hex) { return hex.IsMarked(); }).length;
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
        neighbors.push(that.hexes[index - 1]);
      }
      
      if (row < height - 1) {
        neighbors.push(that.hexes[index + 1]);
      }
  
      if (col > 0) {
        neighbors.push(that.hexes[index - height]);
        
        if (col % 2 == 1) {
          if (row < height - 1) {
            neighbors.push(that.hexes[index - height + 1]);
          }
        } else {
          if (row > 0) {
            neighbors.push(that.hexes[index - height - 1]);
          }
        }
      }
      
      if (col < width - 1) {
        neighbors.push(that.hexes[index + height]);
        
        if (col % 2 == 1) {
          if (row < height - 1) {
            neighbors.push(that.hexes[index + height + 1]);
          }
        } else {
          if (row > 0) {
            neighbors.push(that.hexes[index + height - 1]);
          }
        }
      }
     
      return neighbors.filter(cond);
    }
    
    function FindHex(coords) {
      for (var i = 0; i < that.hexes.length; i++) {
        var hex = that.hexes[i];
        if (hex.Contains(coords)) {
          return hex;
        }
      }
    }
    
    function ClickRight(hit) {
      if (hit.IsOpen()) {
        if (LeftMousePressed()) {
          HandleBothPressed(hit); 
        }
      } else {
        hit.ToggleMark();
      }
    }
    
    function ClickLeft(hit) {
      if (hit.IsOpen()) {
        if (RightMousePressed()) {
          HandleBothPressed(hit);
        }
      } else {
        if (!hit.IsMarked()) {
          OpenHex(hit);
        }
      }
    }
    
    function GameOver() {
      for_each(that.hexes, function(hex) { hex.Open();});
      that.gameover = true;
      that.victory = false;
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
        neibs = GetNeighbors(res_hex, function(hex) { return !hex.IsOpen() && !hex.IsMarked(); });
        for_each(neibs, function (neib_hex) { neib_hex.Open(); });
      });
      
      for_each(that.hexes, function(hex) { hex.visited = false; });
    }
    
    function CheckVictory() {
      if (!that.gameover) { // Victory condition
        
        var closedNonMines = that.hexes.filter(function(hex) { return !hex.IsOpen() && !hex.mine;});
                
        if (closedNonMines.length == 0) {
          that.victory = true;
          that.gametime = (new Date().getTime() - that.starttime) / 1000;
          
          var mines = that.hexes.filter(function(hex) { return hex.mine; });
          
          for_each(mines, function(hex) { hex.ReDraw(); });
          
        }
      }
    }
    
    function GameInProgress() {
      return that.hexes.filter(function(hex) { return hex.IsOpen(); }).length > 0;
    }
    
    function OnGameStarted() {
      that.starttime = new Date().getTime();
    }
    
    var mouseButtonsDown = [];
    
    this.OnMouseDown = function(coords, button) {
      mouseButtonsDown[button] = true;
      
      if (this.slider.Contains(coords) && !GameInProgress()) {
        this.slider.OnMouseDown(coords, button);
      }
      
      var hit = FindHex(coords);
      
      if (this.victory || this.gameover) {
        this.InitGame();
      } else { // Game in progress or about to start
        if (hit != undefined) {
          if (button == 1 ) {
            ClickLeft(hit);
          } else if (button == 3) {
            ClickRight(hit);
          }
        }
      }
      Draw();
    }
    
    this.OnMouseUp = function(button) {
      mouseButtonsDown[button] = false;
      this.slider.OnMouseUp();
      if (!GameInProgress()) {
        InitMines(); // Reinit because difficulty might have changed
      }
      Draw();
    }
    
    
    this.OnMouseMove = function(coords) {
      this.slider.OnMouseMove(coords);
    }
    
    function RightMousePressed() {
      return mouseButtonsDown[3];
    }
    
    function LeftMousePressed() {
      return mouseButtonsDown[1];
    }
    
    function HandleBothPressed(hit) {
      if (hit.IsOpen()) {
        var neibsMarked = GetNeighbors(hit, function (hex) { return hex.IsMarked(); }).length;        
        if (neibsMarked == hit.neighborMines) {
          var nonMarked = GetNeighbors(hit, function(hex) { return !hex.IsMarked(); });
          for_each(nonMarked, function(hex) {OpenHex(hex)});
        }
      }
    }
    
    function OpenHex(hit) {
      if (!hit.IsOpen()) {
        if (!GameInProgress()) {
          OnGameStarted();
        }
        hit.Open();
        if (hit.mine) {
          GameOver();
        } else if (hit.neighborMines == 0) {
          EmptyClicked(hit);
        }
        CheckVictory();
      }
    }
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
    GetCanvas().onmousemove = OnMouseMoveCB;
    GetCanvas().style.backgroundColor = bgColor;
    document.onkeydown = OnKey;
    document.body.style.backgroundColor = bgColor;
    this.hg = new HexGrid(26, 18, 20, { x: 40, y: 80});
    
    StartGame();
  }
  
  function StartGame() {
    this.hg.InitGame();
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
  
  function OnMouseMove(coords) {
    this.hg.OnMouseMove(coords);
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
  
  function OnMouseMoveCB(ev) {
    x = ev.clientX;
    y = ev.clientY;
    canv = ScreenToCanvas(ev.clientX, ev.clientY);
    OnMouseMove(canv);
  }
  
  return this;
}