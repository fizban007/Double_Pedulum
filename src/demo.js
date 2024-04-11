import * as THREE from '../node_modules/three/build/three.module.js';
// import Stats from '../vendor/stats.module.js';
import { GUI } from '../node_modules/dat.gui/build/dat.gui.module.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from '../node_modules/three/examples/jsm/lines/Line2.js';
// import * as MeshLine from '../vender/THREE.MeshLine.js';
import { LineMaterial } from '../node_modules/three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from '../node_modules/three/examples/jsm/lines/LineGeometry.js';
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
// import { RungeKutta4 } from '../node_modules/runge-kutta-4/dist/runge-kutta-4.min.js';
var RungeKutta4 = require('runge-kutta-4')

const width = window.innerWidth;
const height = window.innerHeight;
const aspect = width / height;
const canvas = document.getElementById("vis");
var renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true
});
renderer.setSize(width, height);

/// Setting up the scene
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
// THREE.Object3D.DefaultUp.set(0.5,0.0,0.8);
var camera = new THREE.PerspectiveCamera(30, width / height, 1, 1000);
var camera_d = 150.0;
camera.position.x = camera_d;
camera.up.set(0, 0, 1);
camera.lookAt(new THREE.Vector3(0, 0, 0));

var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableKeys = false;

/// Config contains the physical and visualization parameters
var Config = function () {
  this.L1 = 10.0;
  this.L2 = 10.0;
  this.m1 = 1.0;
  this.m2 = 1.0;
  this.phi1 = 0.2;
  this.dphi1dt = 0.0;
  this.phi2 = 0.5;
  this.dphi2dt = 0.0;
  this.g = 9.81;
  this.dt = 0.02;
  this.run = false;
  this.running = false;
  this.reset_camera = function() {
    controls.reset();
  }
}
var conf = new Config();

/// Add lighting to the star and other meshes
var directionalLight = new THREE.DirectionalLight(0xffffffff);
directionalLight.position.set(107, 107, 107);
scene.add(directionalLight);

var light = new THREE.AmbientLight(0xffffff); // soft white light
scene.add(light);

const axesHelper = new THREE.AxesHelper( 10 );
scene.add( axesHelper );

/// Add first rod
var pivot1 = new THREE.Group();
pivot1.position.set(0, 0, 0);
scene.add(pivot1);

var rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 32),
                          new THREE.MeshPhongMaterial({ color: 0xdddddd }));
rod1.geometry.translate(0, -0.5, 0);
rod1.scale.set(1.0, conf.L1, 1.0);
rod1.rotateX(Math.PI/2);
pivot1.add(rod1);
var mass1 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32),
                           new THREE.MeshPhongMaterial({ color: 0xdd0000 }));
mass1.scale.set(conf.m1, conf.m1, conf.m1);
mass1.translateZ(-conf.L1);
pivot1.add(mass1);
var pivot2 = new THREE.Group();
pivot1.add(pivot2);
pivot2.position.set(0, 0, -conf.L1);

var rod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 32),
                          new THREE.MeshPhongMaterial({ color: 0xdddddd }));
rod2.geometry.translate(0, -0.5, 0);
rod2.scale.set(1.0, conf.L2, 1.0);
rod2.rotateX(Math.PI/2);
pivot2.add(rod2);

var mass2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32),
                           new THREE.MeshPhongMaterial({ color: 0x00dd00 }));
mass2.scale.set(conf.m2, conf.m2, conf.m2);
mass2.translateZ(-conf.L2);
pivot2.add(mass2);

// pivot1.rotateOnWorldAxis(new THREE.Vector3(1.0, 0.0, 0.0), conf.phi1);
pivot1.setRotationFromAxisAngle(new THREE.Vector3(1.0, 0.0, 0.0), conf.phi1);

const gui = new GUI();
gui.add(conf, 'phi1', -2.0*Math.PI, 2.0*Math.PI).name('phi1').listen();
gui.add(conf, 'phi2', -2.0*Math.PI, 2.0*Math.PI).name('phi2').listen();
gui.add(conf, 'L1', 1.0, 20.0).name('L1').listen();
gui.add(conf, 'L2', 1.0, 20.0).name('L2').listen();
gui.add(conf, 'm1', 0.1, 5.0).name('m1').listen();
gui.add(conf, 'm2', 0.1, 5.0).name('m2').listen();
gui.add(conf, 'dt', 0.001, 0.1, 0.001).name('dt').listen();
gui.add(conf, 'reset_camera').name('Reset Camera');

var dt = 0.001;

var derives = function(x, y) {
  var phi1 = y[0];
  var phi1dot = y[1];
  var phi2 = y[2];
  var phi2dot = y[3];

  var m1 = conf.m1;
  var m2 = conf.m2;
  var L1 = conf.L1;
  var L2 = conf.L2;
  var g = conf.g;

  var sin_dphi = Math.sin(phi2-phi1);
  var cos_dphi = Math.cos(phi2-phi1);
  var sin_phi1 = Math.sin(phi1);
  var sin_phi2 = Math.sin(phi2);

  var phi1ddot = (m2 * L1 * phi1dot * phi1dot * sin_dphi * cos_dphi +
                  m2 * g * sin_phi2 * cos_dphi +
                  m2 * L2 * phi2dot * phi2dot * sin_dphi -
                  (m1 + m2) * g * sin_phi1)
    / (L1 * (m1 + m2 * sin_dphi * sin_dphi));

  var phi2ddot = (-m2 * L2 * phi2dot * phi2dot * sin_dphi * cos_dphi -
                  L1 * (m1 + m2) * phi1dot * phi1dot * sin_dphi +
                  (m1 + m2) * g * (sin_phi1 * cos_dphi - sin_phi2))
    / (L2 * (m1 + m2 * sin_dphi * sin_dphi));

  return [phi1dot, phi1ddot, phi2dot, phi2ddot];
}

var rk4 = new RungeKutta4(derives, 0.0, [conf.phi1, conf.dphi1dt, conf.phi2, conf.dphi2dt], dt);

var start_stop_integration = function() {
  if (conf.run) {
    rk4 = new RungeKutta4(derives, 0.0, [conf.phi1, conf.dphi1dt, conf.phi2, conf.dphi2dt], dt);
    conf.running = true;
    // console.log(conf);
  } else {
    conf.running = false;
  }
}

gui.add(conf, 'run').name('Run').listen().onChange(start_stop_integration);

function animate() {
  requestAnimationFrame(animate, canvas);

  rod1.scale.set(1.0, conf.L1, 1.0);
  // mass1.position.y = conf.L1 * Math.sin(conf.phi1);
  mass1.position.z = -conf.L1;
  mass1.scale.set(conf.m1, conf.m1, conf.m1);
  pivot2.position.z = -conf.L1;
  // rod1.translateY(-conf.L1/2);
  rod2.scale.set(1.0, conf.L2, 1.0);
  mass2.position.z = -conf.L2;
  mass2.scale.set(conf.m2, conf.m2, conf.m2);

  pivot1.setRotationFromAxisAngle(new THREE.Vector3(1.0, 0.0, 0.0), conf.phi1);
  pivot2.setRotationFromAxisAngle(new THREE.Vector3(1.0, 0.0, 0.0), conf.phi2 - conf.phi1);
  if (conf.running) {
    var y = rk4.steps(Math.floor(conf.dt/dt));
    if (y[0] > 2.0 * Math.PI)
      y[0] -= 2.0 * Math.PI;
    if (y[2] > 2.0 * Math.PI)
      y[2] -= 2.0 * Math.PI;
    if (y[0] < -2.0 * Math.PI)
      y[0] += 2.0 * Math.PI;
    if (y[2] < -2.0 * Math.PI)
      y[2] += 2.0 * Math.PI;
    conf.phi1 = y[0];
    conf.dphi1dt = y[1];
    conf.phi2 = y[2];
    conf.dphi2dt = y[3];
  }
  // set_rotation(conf.phi, conf.theta, conf.psi);

  renderer.render(scene, camera);
  // controls.update();
}

animate();
