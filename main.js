"use strict";

var canvas;
var gl;

var numPositionsCube = 36;
var numPositionsPyramid = 18;
var numPositions = numPositionsCube;
var positionsArray = [];
var normalsArray = [];

var verticesCube = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];

var verticesPyramid = [
    vec4(0.0, 0.5, 0.0, 1.0), // Apex
    vec4(-0.5, -0.5, 0.5, 1.0), // Base front-left
    vec4(0.5, -0.5, 0.5, 1.0),  // Base front-right
    vec4(0.5, -0.5, -0.5, 1.0), // Base back-right
    vec4(-0.5, -0.5, -0.5, 1.0) // Base back-left
];

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);  // Light position (x, y, z, w)
var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(1.0, 0.8, 0.0, 1.0);
var materialShininess = 20.0;

var baseColor = vec4(1.0, 0.0, 0.0, 1.0);  // Initial base color

var ctm;
var ambientColor, diffuseColor, specularColor;
var modelViewMatrix, projectionMatrix;
var viewerPos;
var program;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;
var theta = vec3(0, 0, 0);

var thetaLoc;
var flag = false;
var shape = "cube";  // Current shape

// New variable to track horizontal position
var positionX = 0.0;
var positionY = 0.0; 
var speed = 0.0;
var isMoving = false; 
var gravity = -9.81; // Gravity constant
var velocityX = 0.0; // Horizontal velocity
var velocityY = 0.0; // Vertical velocity
var angle = 0.0; // Launch angle in radians
var isMove = false; 


init();

function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    colorCube(); // Initialize with cube

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    thetaLoc = gl.getUniformLocation(program, "theta");

    viewerPos = vec3(0.0, 0.0, -20.0);
    // Calculate aspect ratio
    var aspectRatio = canvas.width / canvas.height;
    
    // Adjust the projection matrix based on the aspect ratio
    if (aspectRatio > 1) {
        projectionMatrix = ortho(-3 * aspectRatio, 3 * aspectRatio, -3, 3, -100, 100);
    } else {
        projectionMatrix = ortho(-3, 3, -3 / aspectRatio, 3 / aspectRatio, -100, 100);
    }


    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    document.getElementById("ButtonX").onclick = function () {
        axis = xAxis;
    };
    document.getElementById("ButtonY").onclick = function () {
        axis = yAxis;
    };
    document.getElementById("ButtonZ").onclick = function () {
        axis = zAxis;
    };
    document.getElementById("ButtonT").onclick = function () {
        flag = !flag;
    };
    document.getElementById("ButtonShape").onclick = function () {
        shape = (shape === "cube") ? "pyramid" : "cube";
        positionsArray = [];
        normalsArray = [];

        if (shape === "cube") {
            colorCube();
            numPositions = numPositionsCube;
        } else {
            colorPyramid();
            numPositions = numPositionsPyramid;
        }

        // Update the buffer data when the shape changes
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    };

    // New event listeners for movement buttons
    document.getElementById("moveLeft").onclick = function () {
        positionX += 0.1; // Move left by 0.1 units
    };

    document.getElementById("moveRight").onclick = function () {
        positionX -= 0.1; // Move right by 0.1 units
    };

    document.getElementById("moveUp").onclick = function () {
        positionY += 0.1; // Move up by 0.1 units
    };

    document.getElementById("moveDown").onclick = function () {
        positionY -= 0.1; // Move down by 0.1 units
    };
    

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));
    gl.uniform4fv(gl.getUniformLocation(program, "uBaseColor"), baseColor);  // Base color uniform

    // Event listeners for color pickers
    document.getElementById("baseColorPicker").oninput = function () {
        baseColor = hexToVec4(this.value);
        gl.uniform4fv(gl.getUniformLocation(program, "uBaseColor"), baseColor);
    };

    document.getElementById("ambientColorPicker").oninput = function () {
        lightAmbient = hexToVec4(this.value);
        ambientProduct = mult(lightAmbient, materialAmbient);
        gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
    };

    document.getElementById("diffuseColorPicker").oninput = function () {
        lightDiffuse = hexToVec4(this.value);
        diffuseProduct = mult(lightDiffuse, materialDiffuse);
        gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
    };

    document.getElementById("specularColorPicker").oninput = function () {
        lightSpecular = hexToVec4(this.value);
        specularProduct = mult(lightSpecular, materialSpecular);
        gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
    };

    document.getElementById("lightXSlider").oninput = function () {
        lightPosition[0] = parseFloat(this.value);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    };

    document.getElementById("lightYSlider").oninput = function () {
        lightPosition[1] = parseFloat(this.value);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    };

    document.getElementById("lightZSlider").oninput = function () {
        lightPosition[2] = parseFloat(this.value);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    };



    document.getElementById("calculateSpeed").onclick = function () {
        var force = parseFloat(document.getElementById("forceInput").value);
        var mass = parseFloat(document.getElementById("massInput").value);
        
        if (!isNaN(force) && !isNaN(mass) && mass > 0) {
            // Remove the time part and directly calculate speed
            speed = force / mass; 
            document.getElementById("speedDisplay").innerText =  + Math.abs(speed).toFixed(2) + " m/s²"; // Update display text to show speed
            isMoving = true; // Start moving the object
        } else {
            document.getElementById("speedDisplay").innerText = "Invalid input.";
        }
    };

    document.getElementById("applyManualspeed").onclick = function () {
        var manualspeed = parseFloat(document.getElementById("manualspeedInput").value);
        
        if (!isNaN(manualspeed)) {
            speed = manualspeed; 
            document.getElementById("manualSpeedDisplay").innerText =  + manualspeed.toFixed(2) + " m/s²";
            isMoving = true;
        } else {
            document.getElementById("manualSpeedDisplay").innerText = "Invalid input.";
        }
    };

    render();
}

document.getElementById("stopButton").onclick = function () {
    isMoving = false; 
};

document.getElementById("launchButton").onclick = function () {
    var launchAngle = parseFloat(document.getElementById("angleInput").value);
    gravity = parseFloat(document.getElementById("gravityInput").value);

    if (!isNaN(launchAngle) && !isNaN(gravity)) {
        angle = launchAngle * (Math.PI / 180); // Convert angle to radians
        speed = parseFloat(document.getElementById("speedInput").value); // Assume user input speed
        velocityX = speed * Math.cos(angle);
        velocityY = speed * Math.sin(angle);
        isMove = true; // Start moving the object
    }
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (flag) theta[axis] += 2.0;

    // Update the position based on speed
    if (isMoving) {
        positionX -= speed * 0.1; // Update position based on speed
        
        // Check for borders and bounce back
        const boundary = 10.0; // Adjust this value based on your projection limits
        if (positionX > boundary || positionX < -boundary) {
            speed = -speed; // Reverse the speed to make it bounce
        }
    }

    if (isMove) {
        positionX -= velocityX * 0.1; // Update horizontal position
        velocityY += gravity * 0.1; // Apply gravity
        positionY += velocityY * 0.1; // Update vertical position
        
        // Check if the object is on the ground
        if (positionY <= 0) {
            positionY = 0; // Reset to ground level
            isMove = false; // Stop moving
        }
    }

    // Build the model view matrix from the viewer position
    modelViewMatrix = lookAt(viewerPos, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    
    // Apply translation to positionX
    modelViewMatrix = mult(modelViewMatrix, translate(positionX, positionY, 0));

    // Apply rotations
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[xAxis], vec3(1, 0, 0)));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[yAxis], vec3(0, 1, 0)));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[zAxis], vec3(0, 0, 1)));

    // Update the uniform matrix
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));

    if (shape === "cube") {
        gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    }

    requestAnimationFrame(render);
}



function colorCube() {
    var cubeVertices = [
        verticesCube[0], verticesCube[1], verticesCube[2],
        verticesCube[0], verticesCube[2], verticesCube[3],
        verticesCube[4], verticesCube[5], verticesCube[6],
        verticesCube[4], verticesCube[6], verticesCube[7],
        verticesCube[0], verticesCube[4], verticesCube[5],
        verticesCube[0], verticesCube[5], verticesCube[1],
        verticesCube[2], verticesCube[3], verticesCube[6],
        verticesCube[2], verticesCube[6], verticesCube[7],
        verticesCube[1], verticesCube[2], verticesCube[5],
        verticesCube[2], verticesCube[6], verticesCube[5],
        verticesCube[4], verticesCube[7], verticesCube[0],
        verticesCube[7], verticesCube[3], verticesCube[0]
    ];

    var normalsCube = [
        vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), // front face
        vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
        vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1), // back face
        vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1),
        vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0), // left face
        vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0),
        vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0), // right face
        vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0),
        vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0), // top face
        vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0),
        vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0), // bottom face
        vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0)
    ];

    positionsArray.push(...cubeVertices);
    normalsArray.push(...normalsCube);
}

function colorPyramid() {
    var pyramidVertices = [
        verticesPyramid[0], verticesPyramid[1], verticesPyramid[2], // Front face
        verticesPyramid[0], verticesPyramid[2], verticesPyramid[3], // Right face
        verticesPyramid[0], verticesPyramid[3], verticesPyramid[4], // Back face
        verticesPyramid[0], verticesPyramid[4], verticesPyramid[1], // Left face
        verticesPyramid[1], verticesPyramid[2], verticesPyramid[3], // Base face 1
        verticesPyramid[1], verticesPyramid[3], verticesPyramid[4]  // Base face 2
    ];

    var normalsPyramid = [
        vec3(0, 0.5, 0), vec3(0, 0.5, 0), vec3(0, 0.5, 0), // Front face
        vec3(0.5, 0, 0), vec3(0.5, 0, 0), vec3(0.5, 0, 0), // Right face
        vec3(0, 0, -0.5), vec3(0, 0, -0.5), vec3(0, 0, -0.5), // Back face
        vec3(-0.5, 0, 0), vec3(-0.5, 0, 0), vec3(-0.5, 0, 0), // Left face
        vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0), // Base face
        vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0)
    ];

    positionsArray.push(...pyramidVertices);
    normalsArray.push(...normalsPyramid);
}

function hexToVec4(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return vec4(r, g, b, 1.0);  // Return vec4 with alpha = 1
}