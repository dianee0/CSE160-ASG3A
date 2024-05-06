// HelloPoint1.js (c) 2012 matsuda

// Vertex shader programa
var VSHADER_SOURCE =`
  precision mediump float;
  attribute vec4 a_Position; 
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    // gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  
  uniform int u_whichTexture;
  void main() {

    if(u_whichTexture == -2){
      gl_FragColor = u_FragColor; //use color

    }else if (u_whichTexture == -1){ //use UV debug color
      gl_FragColor = vec4(v_UV,1,1);

    }else if (u_whichTexture == 0){ //use texture0
      gl_FragColor = texture2D(u_Sampler0, v_UV);

    } else if (u_whichTexture == 1) { // Use texture1
      gl_FragColor = texture2D(u_Sampler1, v_UV); // Second texture

    }else{ //error put reddish
      gl_FragColor = vec4(1,.2,.2,1);
    }

  }`

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_GlobalRotateMatrix;
let u_whichTexture;
let u_Sampler0;
let u_Sampler1;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  

  gl.disable(gl.BLEND);
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
    }

  // Get the storage location of u_GlobalRotateMatrix
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
    }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
    }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }


  // Get the storage location of the u_Sampler
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if(!u_Sampler0){
    console.log('Failed to get the storage location of u_Sampler0');
    return ;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if(!u_Sampler1){
    console.log('Failed to get the storage location of u_Sampler1');
    return ;
  }

  // Retrieve locations for all the uniforms and attributes
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
      console.log('Failed to get the storage location of u_whichTexture');
      return;
  }

    

    //Set the initial value for this matrix to identify
    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// global variable for UI elements
let g_selectedColor=[1.0,1.0,1.0,1.0]
let g_selectedSize=5;
let g_selectedType="POINT";

let g_globalAngle = 0;
let g_armAngle = 0;
let g_legAngle = 0;
let g_backFootAngle = 0;
let g_feetAngle = 0;

let g_Animation = false;


function addActionsForHTMLUI(){

    // // slider events
    // document.getElementById("redSlide").addEventListener("mouseup", function() { g_selectedColor[0] = this.value/100; })
    document.getElementById("animationOnButton").onclick = function() { g_Animation =true; }
    document.getElementById("animationOffButton").onclick = function() { g_Animation =false; }

    canvas.onclick = function(ev) {
        if (ev.shiftKey) {
            triggerWinkAnimation(); // Call the wink animation function
        }
    };

    document.getElementById("armSlide").addEventListener("mousemove", function() { g_armAngle = this.value; renderAllShapes(); })
    document.getElementById("backfeetSlide").addEventListener("mousemove", function() { g_backFootAngle = this.value; renderAllShapes(); })
    document.getElementById("legSlide").addEventListener("mousemove", function() { g_legAngle = this.value; renderAllShapes(); })

    document.getElementById("angleSlide").addEventListener("mousemove", function() { g_globalAngle = this.value; renderAllShapes(); })
    document.getElementById("resetCameraButton").onclick = resetCameraAngles;



}

function initTextures(gl, n) {
  var image0 = new Image();  // Image for first texture
  var image1 = new Image();  // Image for second texture

  image0.onload = function() { sendTextureToGLSL(image0, 0); };  // Bind image0 to texture unit 0
  image0.src = 'sky.jpg';  // Set source for the first texture

  image1.onload = function() { sendTextureToGLSL(image1, 1); };  // Bind image1 to texture unit 1
  image1.src = 'panther.jpg';  // Set source for the second texture

  return true;
}

function sendTextureToGLSL(image, textureUnit) {
  var texture = gl.createTexture(); 
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0 + textureUnit);  // Activate the appropriate texture unit
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  if (textureUnit == 0) {
    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    gl.uniform1i(u_Sampler0, 0);  // Set the texture unit to 0
  } else if (textureUnit == 1) {
    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    gl.uniform1i(u_Sampler1, 1);  // Set the texture unit to 1
  }

  console.log('Texture loaded for unit ' + textureUnit);
}



function main() {

    // set up canvas and gl variables
    setupWebGL();
    // set up GLSL and connect GLSL variables
    connectVariablesToGLSL();

    // Set up actions for the HTML UI elements
    addActionsForHTMLUI();
    initMouseControls(); // Initialize mouse controls

    initTextures(gl,0);


    // Specify the color for clearing <canvas>
    // gl.clearColor(91/255, 138/255, 83/255, 1.0);

    // renderAllShapes();
    requestAnimationFrame(tick);

}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

function tick() {
    // print some debug info so we know we are running
    g_seconds = performance.now()/1000.0-g_startTime;
    // console.log(g_seconds);

    // update animation angles
    updateAnimationAngles();

    // draw everything
    renderAllShapes();

    // tell browser to update again when it has time
    requestAnimationFrame(tick);
}


var g_shapesList = [];


function click(ev) {

    // extract the event click and return it in WebGL coordinats
    let [x,y] = convertCoordinatesEventToGL(ev);
    // create and store the new point
    let point;
    if (g_selectedType == POINT){
    point = new Point();
    } else if (g_selectedType == TRIANGLE){
    point = new Triangle();
    } else {
    point = new Circle();
    point.segments = g_selectedSegments; // Seting the num of segments
    }
    point.position=[x,y];
    point.color=g_selectedColor.slice();
    point.size=g_selectedSize;
    g_shapesList.push(point);

    // Draw every shape that is supposed to be in the canvas
    renderAllShapes();
}

function convertCoordinatesEventToGL(ev){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    return ([x,y]);
}

let isWinking = false;
let winkDuration = 0.5; // Duration of the wink in seconds
let currentWinkTime = 0; // Current time elapsed in the wink animation

function triggerWinkAnimation() {
    isWinking = true;
    currentWinkTime = 0; // Reset the timer
}

function updateAnimationAngles() {
    if (g_Animation) { // if yellow animation is on
        g_armAngle = (45*Math.sin(g_seconds));
        g_legAngle = (35*Math.sin(g_seconds))
        g_backFootAngle = 27.5 + 17.5 * Math.sin(g_seconds);  // Oscillates between 0 and 45 degrees

    }
    if (isWinking) {
        currentWinkTime += animationDelta; // Update time based on your frame time calculation
        if (currentWinkTime > winkDuration) {
            isWinking = false;
            currentWinkTime = 0;
        }
    }

}

function resetCameraAngles() {
    // Reset angles
    g_globalAngle = 0;
    g_globalAngleY = 0;
    g_globalAngleZ = 0;

    // Update slider positions
    document.getElementById('angleSlide').value = 0;
    document.getElementById('angleYSlide').value = 0;
    document.getElementById('angleZSlide').value = 0;

    // Re-render the scene
    renderAllShapes();
}

function initMouseControls() {
    let isDragging = false;
    let lastX = -1, lastY = -1;

    canvas.onmousedown = function(ev) {
        const rect = ev.target.getBoundingClientRect();
        lastX = ev.clientX - rect.left;
        lastY = ev.clientY - rect.top;
        isDragging = true;
    };

    canvas.onmousemove = function(ev) {
        if (isDragging) {
            const rect = ev.target.getBoundingClientRect();
            let x = ev.clientX - rect.left;
            let y = ev.clientY - rect.top;
            let factor = 90 / canvas.height; // Increases sensitivity
            let dx = factor * (x - lastX);
            let dy = factor * (y - lastY);
            
            // Update global angles
            g_globalAngleY += dy;
            g_globalAngle += dx;
            
            // Update sliders if you have them on UI
            document.getElementById('angleSlide').value = g_globalAngle;
            document.getElementById('angleYSlide').value = g_globalAngleY;
            
            renderAllShapes();

            lastX = x;
            lastY = y;
        }
    };

    canvas.onmouseup = function(ev) {
        isDragging = false;
    };

    canvas.onmouseleave = function(ev) {
        isDragging = false;
    };
}

function renderAllShapes(){

  var startTime = performance.now();

  //Pass the Projection Matrix 
  var projMat = new Matrix4();

  projMat.setPerspective(60, canvas.width/canvas.height, .1, 1000);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  //Pass the view Matrix
  var viewMat = new Matrix4();
  viewMat.setLookAt(0, 0, 3, 0, 0, 0, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var globalRotMat = new Matrix4().rotate(g_globalAngle,0,1,0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);  

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT );

  //sky 
  var skybox = new Cube();
  skybox.color = [1,0,0,1];
  skybox.textureNum = 0; // Assuming texture unit 0 has the sky texture
  skybox.matrix.scale(50, 50, 50); // Adjust size as needed
  skybox.matrix.translate(-0.5, -0.5, -0.5); // Center the cube
  skybox.render();

  //Floor
  var floor = new Cube();
  floor.color = [0.0,1.0,0.0,1.0];
  floor.textureNum = -2;
  floor.matrix.translate(0,-.75,0.0);
  floor.matrix.scale(10,0,10);
  floor.matrix.translate(-.5,0,-0.5);
  floor.render();

  

  // Draw the white body cube
  var body = new Cube();
  body.color = [1.0,1.0,1.0,1.0];
  body.textureNum = 0;
  body.matrix.translate(-.4,-.3,0.0);
  body.matrix.rotate(10,1,0,0);
  body.matrix.scale(0.5,0.5,0.5);
  body.render();

  // white cube body
  var body2 = new Cube();
  body2.color = [1.0,1.0,1.0,1.0];
  body2.textureNum = 1;
  body2.matrix.translate(-.4,-.39,0.48);
  body2.matrix.rotate(10,1,0,0);
  body2.matrix.scale(0.5,0.5001,0.5);
  body2.render();

  // Right Thigh
  var rightThigh = new Cube();
  rightThigh.textureNum = -2;
  rightThigh.color = [1.0,1.0,1.0,1.0];
  rightThigh.matrix.translate(0, -0.5, 0.54);
  rightThigh.matrix.rotate(-g_legAngle, 1, 0, 0);
  var thighCoordR = new Matrix4(rightThigh.matrix);
  rightThigh.matrix.rotate(10, 1, 0, 0);
  rightThigh.matrix.scale(0.2, 0.4, 0.5);
  rightThigh.render();

  // Back Foot Right
  var backFootRight = new Cube();
  backFootRight.color = [1.0,1.0,1.0,1.0];
  backFootRight.matrix = new Matrix4(thighCoordR);
  backFootRight.matrix.translate(0, -0.18, 0.0);
  // backFootRight.matrix.translate(0, 0.05, 0); // adjust
  backFootRight.matrix.rotate(-g_backFootAngle, 1, 0, 0);
  // backFootRight.matrix.translate(0, -0.05, 0); // adjust

  var backCoordR = new Matrix4(backFootRight.matrix);
  backFootRight.matrix.scale(0.2, 0.1, 0.5);
  backFootRight.render();


  // Front Foot Right - Using setTranslate to initialize the position
  var frontFootRight = new Cube();
  frontFootRight.color = [1,1,1,1];
  frontFootRight.matrix = new Matrix4(backCoordR);

  frontFootRight.matrix.translate(0, 0, -.29); // Sets the position ignoring any previous transformations
  frontFootRight.matrix.scale(0.2, 0.1, 0.3);
  frontFootRight.render();

  // left leg

  var leftThigh = new Cube();
  leftThigh.color = [1.0,1.0,1.0,1.0];
  leftThigh.matrix.translate(-.5,-0.5,0.54);
  leftThigh.matrix.rotate(-g_legAngle,1,0,0);
  var thighCoordL = new Matrix4(leftThigh.matrix);
  leftThigh.matrix.rotate(10,1,0,0);
  leftThigh.matrix.scale(0.2,0.4,0.5);
  leftThigh.render();

  var backFootLeft = new Cube();
  backFootLeft.color = [1.0,1.0,1.0,1.0];
  backFootLeft.matrix = thighCoordL;
  backFootLeft.matrix.translate(0,-0.18,0);
  backFootLeft.matrix.rotate(-g_backFootAngle, 1, 0, 0);


  var backCoordL = new Matrix4(backFootLeft.matrix);

  backFootLeft.matrix.scale(0.2,0.1,0.5);
  backFootLeft.render();



  var frontFootLeft = new Cube();
  frontFootLeft.color = [1,1,1,1];
  frontFootLeft.matrix = new Matrix4(backCoordL);

  frontFootLeft.matrix.translate(0,0,-.29);
  // frontFootLeft.matrix.translate(-.5,-0.68,-0.29);
  frontFootLeft.matrix.scale(0.2,0.1,0.3);
  frontFootLeft.render();

  var head = new Cube();
  head.color = [1,1,1,1];
  head.matrix.translate(-.375,0,-0.3);
  head.matrix.scale(0.45,0.45,0.45);
  head.render();

  var leftEar = new Cube();
  leftEar.color = [1,1,1,1];
  leftEar.matrix.translate(-.4,.4,-0.3);
  leftEar.matrix.rotate(8,0,0);
  leftEar.matrix.scale(0.2,0.4,0.08);
  leftEar.render();

  var RightEar = new Cube();
  RightEar.color = [1,1,1,1];
  RightEar.matrix.translate(-0.1,.43,-0.3);
  RightEar.matrix.rotate(-8,0,0);
  RightEar.matrix.scale(0.2,0.4,0.08);
  RightEar.render();

  innerLeftEar = new Cube();
  innerLeftEar.color = [0.902, 0.627, 0.604, 1];
  innerLeftEar.matrix.translate(-.3,.43,-0.3001);
  innerLeftEar.matrix.rotate(8,0,0);
  innerLeftEar.matrix.scale(0.1,0.3,0.08);
  innerLeftEar.render();

  innerRightEar = new Cube();
  innerRightEar.color = [0.902, 0.627, 0.604, 1];
  innerRightEar.matrix.translate(-0.1,.44,-0.3001);
  innerRightEar.matrix.rotate(-8,0,0);
  innerRightEar.matrix.scale(0.1,0.3,0.08);
  innerRightEar.render();


  var leftArm = new Cube();
  leftArm.color = [1,1,1,1];
  // leftArm.matrix.rotate(-g_armAngle,0,-1,-1);
  leftArm.matrix.translate(-.5,-0.68,0);
  // Additional translation to align the rotation axis at the shoulder (assuming the length is 0.6, we adjust half of it)
  leftArm.matrix.translate(0, 0.5, 0);
  leftArm.matrix.rotate(-g_armAngle,1,0,0);
  // Translate back
  leftArm.matrix.translate(0, -0.5, 0);
  leftArm.matrix.scale(0.2,0.6,0.2);
  leftArm.render();

  var rightArm = new Cube();
  rightArm.color = [1,1,1,1];
  rightArm.matrix.translate(0,-0.68,0);
  // Additional translation to align the rotation axis at the shoulder
  rightArm.matrix.translate(0, 0.5, 0);
  rightArm.matrix.rotate(-g_armAngle,1,0,0);
  // Translate back
  rightArm.matrix.translate(0, -0.5, 0);
  rightArm.matrix.scale(0.2,0.6,0.2);
  rightArm.render();

  var nose = new Cube();
  nose.color = [237/255, 109/255, 109/255, 1];
  nose.matrix.translate(-0.1875,0.2,-0.33);
  nose.matrix.scale(0.05,0.05,0.05);
  nose.render();

  var eyeDarkLeft = new Cube();
  eyeDarkLeft.color = [0.18, 0.18, 0.18, 1];
  eyeDarkLeft.matrix.translate(-0.2375,0.25,-0.31);
  eyeDarkLeft.matrix.scale(0.05,0.05,0.02);
  eyeDarkLeft.render();

  var eyeWhiteLeft = new Cube();
  eyeWhiteLeft.color = [0.71, 0.71, 0.71, 1];
  eyeWhiteLeft.matrix.translate(-0.2375,0.3,-0.31);
  eyeWhiteLeft.matrix.scale(0.05,0.05,0.02);
  eyeWhiteLeft.render();

  var eyeDarkRight = new Cube();
  eyeDarkRight.color = [0.18, 0.18, 0.18, 1];
  eyeDarkRight.matrix.translate(-0.1375,0.25,-0.31);
  eyeDarkRight.matrix.scale(0.05,0.05,0.02);
  eyeDarkRight.render();

  var eyeWhiteRight = new Cube();
  eyeWhiteRight.color = [0.71, 0.71, 0.71, 1];
  eyeWhiteRight.matrix.translate(-0.1375,0.3,-0.31);
  eyeWhiteRight.matrix.scale(0.05,0.05,0.02);
  eyeWhiteRight.render();

  var duration = performance.now() - startTime;
sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
  console.log("Failed to get " + htmlID + " from HTML");
  return;
  }
  htmlElm.innerHTML = text;
}