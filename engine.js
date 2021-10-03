import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import earthmap from './assets/earthmap-high.jpg';
import circle from './assets/circle.png';
import { parseTleFile as parseTleFile, getPositionFromTle } from "./tle";
import { earthRadius } from "satellite.js/lib/constants";


const SatelliteSize = 50;
const ixpdotp = 1440 / (2.0 * 3.141592654) ;

let TargetDate = new Date();

const defaultOptions = {
    backgroundColor: 0x333340,
    defaultSatelliteColor: 0xff0000,
    onStationClicked: null
}

const defaultStationOptions = {
    orbitMinutes: 0,
    satelliteSize: 50
}

export class Engine {

    stations = [];

    initialize(container, options = {}) {
        this.el = container;
        this.raycaster = new THREE.Raycaster();
        this.options = { ...defaultOptions, ...options };

        this._setupScene();
        this._setupLights();
        this._addBaseObjects();

        this.render();

        window.addEventListener('resize', this.handleWindowResize);
        window.addEventListener('pointerdown', this.handleMouseDown);
    }

    dispose() {
        window.removeEventListener('pointerdown', this.handleMouseDown);
        window.removeEventListener('resize', this.handleWindowResize);
        //window.cancelAnimationFrame(this.requestID);
        
        this.raycaster = null;
        this.el = null;

        this.controls.dispose();
    }

    handleWindowResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.render();
    };

    handleMouseDown = (e) => {
        const mouse = new THREE.Vector2(
            (e.clientX / window.innerWidth ) * 2 - 1,
            -(e.clientY / window.innerHeight ) * 2 + 1 );

	    this.raycaster.setFromCamera(mouse, this.camera);

        let station = null;

	    var intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if (intersects && intersects.length > 0) {
            const picked = intersects[0].object;
            if (picked) {
                station = this._findStationFromMesh(picked);
	        // console.log(station.satrec.ecco);
            	var nearestDebrisStation = this._getNearestDebris(station);
                this._isolateClickedAndNearestDebris(station,nearestDebrisStation);
            }
        }

        const cb = this.options.onStationClicked;
        if (cb) cb(station);
    }


    // __ API _________________________________________________________________


    addSatellite = (station, color, size) => {
        
        //const sat = this._getSatelliteMesh(color, size);
        const sat = this._getSatelliteSprite(color, size);
        const pos = this._getSatellitePositionFromTle(station);
        if (!pos) return;
        //const pos = { x: Math.random() * 20000 - 10000, y: Math.random() * 20000 - 10000 , z: Math.random() * 20000 - 10000, }

        sat.position.set(pos.x, pos.y, pos.z);
        station.mesh = sat;

        this.stations.push(station);

        if (station.orbitMinutes > 0) this.addOrbit(station);

        this.earth.add(sat);
    }

    loadLteFileStations = (url, color, stationOptions) => {
        const options = { ...defaultStationOptions, ...stationOptions };

        return fetch(url).then(res => {
            if (res.ok) {
                return res.text().then(text => {
                    return this._addTleFileStations(text, color, options);
                
                });
            }
        });
    }

    addOrbit = (station) => {
        if (station.orbitMinutes > 0) return;

        const revsPerDay = station.satrec.no * ixpdotp;
        const intervalMinutes = 1;
        const minutes = station.orbitMinutes || 1440 / revsPerDay;
        const initialDate = new Date();

        //console.log('revsPerDay', revsPerDay, 'minutes', minutes);

        if (!this.orbitMaterial) {
            this.orbitMaterial = new THREE.LineBasicMaterial({color: 0x999999, opacity: 1.0, transparent: true });
        }

        var points = [];
        
        for (var i = 0; i <= minutes; i += intervalMinutes) {
            const date = new Date(initialDate.getTime() + i * 60000);

            const pos = getPositionFromTle(station, date);
            if (!pos) continue;

            points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        var orbitCurve = new THREE.Line(geometry, this.orbitMaterial);
        station.orbit = orbitCurve;
        station.mesh.material = this.selectedMaterial;

        this.earth.add(orbitCurve);
        this.render();
    }

    removeOrbit = (station) => {
        if (!station || !station.orbit) return;

        this.earth.remove(station.orbit);
        station.orbit.geometry.dispose();
        station.orbit = null;
        station.mesh.material = this.material;
        this.render();
    }

    highlightStation = (station) => {
        station.mesh.material = this.highlightedMaterial;
    }

    clearStationHighlight = (station) => {
        station.mesh.material = this.material;
        // this.location.reload();
        // station.mesh.material.visible = true;
	// this.render();
	    // this._makeVisible();
    }

    _addTleFileStations = (lteFileContent, color, stationOptions) => {
        const stations = parseTleFile(lteFileContent, stationOptions);

        const { satelliteSize } = stationOptions;

        stations.forEach(s => {
            this.addSatellite(s, color, satelliteSize);
        });

        this.render();

        return stations;
    }



    _getSatelliteMesh = (color, size) => {
        color = color || this.options.defaultSatelliteColor;
        size = size || SatelliteSize;

        if (!this.geometry) {

            this.geometry = new THREE.BoxBufferGeometry(size, size, size);
            this.material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: 0xFF4040,
                flatShading: false,
                side: THREE.DoubleSide,
            });
        }

        return new THREE.Mesh(this.geometry, this.material);
    }

    _setupSpriteMaterials = (color) => {
        if (this.material) return;
        
        this._satelliteSprite = new THREE.TextureLoader().load(circle, this.render);
        this.selectedMaterial = new THREE.SpriteMaterial({
            map: this._satelliteSprite, 
            color: 0xFF0000,
            sizeAttenuation: false
        });
        this.highlightedMaterial = new THREE.SpriteMaterial({
            map: this._satelliteSprite,
            color: 0xfca300,
            sizeAttenuation: false
        });            
        this.material = new THREE.SpriteMaterial({
            map: this._satelliteSprite, 
            color: color, 
            sizeAttenuation: false
        });            
    }

    _getSatelliteSprite = (color, size) => {
        const SpriteScaleFactor = 5000;

        this._setupSpriteMaterials(color);

        const result = new THREE.Sprite(this.material);
        result.scale.set(size / SpriteScaleFactor, size / SpriteScaleFactor, 1);
        return result;
    }

    _getSatellitePositionFromTle = (station, date) => {
        date = date || TargetDate;
        return getPositionFromTle(station, date);
    }

    updateSatellitePosition = (station, date) => {
        date = date || TargetDate;

        const pos = getPositionFromTle(station, date);
        if (!pos) return;

        station.mesh.position.set(pos.x, pos.y, pos.z);
    }

    
    updateAllPositions = (date) => {
        if (!this.stations) return;

        this.stations.forEach(station => {
            this.updateSatellitePosition(station, date);
        });

        this.render();
    }


    // __ Scene _______________________________________________________________


    _setupScene = () => {
        const width = this.el.clientWidth;
        const height = this.el.clientHeight;

        this.scene = new THREE.Scene();

        this._setupCamera(width, height);

        this.renderer = new THREE.WebGLRenderer({
            logarithmicDepthBuffer: true,
            antialias: true
        });

        this.renderer.setClearColor(new THREE.Color(this.options.backgroundColor));
        this.renderer.setSize(width, height);

        this.el.appendChild(this.renderer.domElement);
    };

    _setupCamera(width, height) {
        var NEAR = 1e-6, FAR = 1e27;
        this.camera = new THREE.PerspectiveCamera(54, width / height, NEAR, FAR);
        this.controls = new OrbitControls(this.camera, this.el);
        this.controls.enablePan = false;
        this.controls.addEventListener('change', () => this.render());
        this.camera.position.z = -15000;
        this.camera.position.x = 15000;
        this.camera.lookAt(0, 0, 0);
    }

    _setupLights = () => {
        const sun = new THREE.PointLight(0xffffff, 1, 0);
        //sun.position.set(0, 0, -149400000);
        sun.position.set(0, 59333894, -137112541);

        const ambient = new THREE.AmbientLight(0x909090);

        this.scene.add(sun);
        this.scene.add(ambient);
    }

    _addBaseObjects = () => {
        this._addEarth();
    };

    render = () => {
        this.renderer.render(this.scene, this.camera);
        //this.requestID = window.requestAnimationFrame(this._animationLoop); 
    };



    // __ Scene contents ______________________________________________________


    _addEarth = () => {
        const textLoader = new THREE.TextureLoader();

        const group = new THREE.Group();

        // Planet
        let geometry = new THREE.SphereGeometry(earthRadius, 50, 50);
        let material = new THREE.MeshPhongMaterial({
            //color: 0x156289,
            //emissive: 0x072534,
            side: THREE.DoubleSide,
            flatShading: false,
            map: textLoader.load(earthmap, this.render)
        });

        const earth = new THREE.Mesh(geometry, material);
        group.add(earth);

        // // Axis
        // material = new THREE.LineBasicMaterial({color: 0xffffff});
        // geometry = new THREE.Geometry();
        // geometry.vertices.push(
        //     new THREE.Vector3(0, -7000, 0),
        //     new THREE.Vector3(0, 7000, 0)
        // );
        
        // var earthRotationAxis = new THREE.Line(geometry, material);
        // group.add(earthRotationAxis);

        this.earth = group;
        this.scene.add(this.earth);

    }

	_isolateClickedAndNearestDebris = (clickedStation,nearestDebris) => {
            for (var i = 0; i < this.stations.length; ++i) {
	    
            const s = this.stations[i];

            if ((s.satrec.satnum !== clickedStation.satrec.satnum) && (s.satrec.satnum !== nearestDebris.satrec.satnum)){

		s.mesh.visible = false;
		// s.mesh.material.color = {r:0, g:1,b:0,isColor:true}
		    
	}
	    }
		this.render();
	}

	// _makeVisible = () => {
        //     for (var i = 0; i < this.stations.length; ++i) {
	//     
        //     const s = this.stations[i];
        //
	// 	s.mesh.visible = true;
	// 	// s.mesh.material.color = {r:0, g:1,b:0,isColor:true}
	// 	    
	//     }
	// 	this.render();
	// };

    _getNearestDebris = (clickedStation) => {

	    //Get Orbital Elements of Clicked Debris Object
	    var a_1 = clickedStation.satrec.a;
	    var ecco_1 = clickedStation.satrec.ecco;
	    var inclo_1 = clickedStation.satrec.inclo;
	    var argpo_1 = clickedStation.satrec.argpo;
	    var nodeo_1 = clickedStation.satrec.nodeo;

            //Initialize Orbital Elements of Iterated Debris Object
	    var a_2 = 0;
	    var ecco_2 = 0;
	    var inclo_2 = 0;
	    var argpo_2 = 0;
	    var nodeo_2 = 0;

	    //Initialize minimum relative inclination value and nearest debris
	    //for selected object
	    var minRelInc = 5; //Greater than max possible value of pi
            var relInc = 5; //Greater than max possible value of pi
	    var nearestDebrisIndex = -1; 

	for (var i = 0; i < this.stations.length; ++i) {
	    
            const s = this.stations[i];

            if (s.satrec.satnum !== clickedStation.satrec.satnum){
	    //Get Orbital Elements of Iterated Debris Object
	    a_2 = s.satrec.a;
	    ecco_2 = s.satrec.ecco;
	    inclo_2 = s.satrec.inclo;
	    argpo_2 = s.satrec.argpo;
	    nodeo_2 = s.satrec.nodeo;

	    relInc = Math.acos(Math.cos(inclo_1)*Math.cos(inclo_2) + Math.sin(inclo_1)*Math.sin(inclo_2)*Math.cos(nodeo_1 - nodeo_2));


		    if (relInc <= minRelInc){
			//Update minRelInc and minDebris if needed
			minRelInc = relInc; 

			//Update nearestDebrisIndex
			nearestDebrisIndex = i;
		    }

             }

	}

	return this.stations[nearestDebrisIndex];
    }

    _findStationFromMesh = (threeObject) => {
        for (var i = 0; i < this.stations.length; ++i) {
            const s = this.stations[i];
            if (s.mesh === threeObject) return s;
        }
	
	// console.log(Math.sqrt(64.0));

        return null;
    }
}
