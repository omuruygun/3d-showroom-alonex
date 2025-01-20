import * as THREE from 'three';

export class RoomManager {
    constructor(scene) {
        this.scene = scene;
        this.createRoom();
        this.createFurniture();
    }

    createRoom() {
        // Create walls with a warm white color
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xfff5e6, // Warm white
            side: THREE.DoubleSide,
            roughness: 0.7,
            metalness: 0.1
        });

        // Floor with warm wood texture
        const floorGeometry = new THREE.PlaneGeometry(24, 24); // Larger room
        const floorTexture = new THREE.TextureLoader().load('../textures/wood_floor.jpg');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(12, 12);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.5,
            metalness: 0.1,
            color: 0xffd7b3 // Warm tint to the wood
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls - making the room larger
        const wallHeight = 14; // Taller room
        const wallWidth = 24; // Wider room

        // Back wall
        const backWallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.z = -12;
        backWall.position.y = wallHeight / 2;
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Left wall
        const leftWallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.x = -12;
        leftWall.position.y = wallHeight / 2;
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // Right wall
        const rightWallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.x = 12;
        rightWall.position.y = wallHeight / 2;
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        // Add modern skirting with warmer color
        this.createSkirting(24, new THREE.Vector3(-12, 0, -12), 0); // Back
        this.createSkirting(24, new THREE.Vector3(-12, 0, -12), Math.PI / 2); // Left
        this.createSkirting(24, new THREE.Vector3(12, 0, -12), -Math.PI / 2); // Right

        // Add windows - making them larger and adding more
        this.createWindow(-4); // Left window
        this.createWindow(4);  // Right window
        
        // Enhanced lighting for a warmer atmosphere
        // Warm ambient light
        const ambientLight = new THREE.AmbientLight(0xfff2e6, 0.7); // Warmer color, stronger intensity
        this.scene.add(ambientLight);

        // Main sunlight (warm)
        const sunLight = new THREE.DirectionalLight(0xffd7b3, 1.0); // Warm sunlight
        sunLight.position.set(5, 10, 5);
        sunLight.castShadow = true;
        // Improve shadow quality
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        this.scene.add(sunLight);

        // Additional fill light for better atmosphere
        const fillLight = new THREE.DirectionalLight(0xfff2e6, 0.4);
        fillLight.position.set(-5, 8, 3);
        this.scene.add(fillLight);
    }

    createFurniture() {
        // Create bed
        this.createBed();
        
        // Create nightstands on both sides
        this.createNightstand(-5); // Left nightstand
        this.createNightstand(5);  // Right nightstand
        
        // Create wardrobe
        this.createWardrobe();
    }

    createBed() {
        // Bed frame with warmer color
        const bedFrameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513, // Warmer wood tone
            roughness: 0.7,
            metalness: 0.1
        });
        const bedFrame = new THREE.Group();

        // Base
        const baseGeometry = new THREE.BoxGeometry(9, 1, 11);
        const base = new THREE.Mesh(baseGeometry, bedFrameMaterial);
        base.position.y = 0.5;
        bedFrame.add(base);

        // Mattress with soft color
        const mattressMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xfffaf0, // Soft warm white
            roughness: 0.9,
            metalness: 0
        });
        const mattressGeometry = new THREE.BoxGeometry(8.5, 1.5, 10.5);
        const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
        mattress.position.y = 1.75;
        bedFrame.add(mattress);

        // Headboard with elegant design
        const headboardGeometry = new THREE.BoxGeometry(9, 6, 0.8);
        const headboard = new THREE.Mesh(headboardGeometry, bedFrameMaterial);
        headboard.position.set(0, 3.5, -5.4);
        bedFrame.add(headboard);

        // Position the entire bed
        bedFrame.position.set(0, 0, -5);
        this.scene.add(bedFrame);
    }

    createNightstand(xPosition) {
        const nightstandMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513, // Matching bed frame
            roughness: 0.7,
            metalness: 0.1
        });
        const nightstand = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(2.5, 3, 2.5);
        const body = new THREE.Mesh(bodyGeometry, nightstandMaterial);
        body.position.y = 1.5;
        nightstand.add(body);

        // Drawer
        const drawerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x9b5523, // Slightly lighter than base
            roughness: 0.7,
            metalness: 0.1
        });
        const drawerGeometry = new THREE.BoxGeometry(2.2, 0.8, 0.1);
        const drawer = new THREE.Mesh(drawerGeometry, drawerMaterial);
        drawer.position.set(0, 1.5, 1.15);
        nightstand.add(drawer);

        // Position the nightstand
        nightstand.position.set(xPosition, 0, -5);
        this.scene.add(nightstand);
    }

    createWardrobe() {
        const wardrobeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513, // Matching other furniture
            roughness: 0.7,
            metalness: 0.1
        });
        const wardrobe = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(8, 12, 2.5);
        const body = new THREE.Mesh(bodyGeometry, wardrobeMaterial);
        body.position.y = 6;
        wardrobe.add(body);

        // Doors with slightly different tone
        const doorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x9b5523, // Slightly lighter
            roughness: 0.7,
            metalness: 0.1
        });
        const doorGeometry = new THREE.BoxGeometry(3.9, 11.8, 0.1);
        
        const leftDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        leftDoor.position.set(-2, 6, 1.2);
        wardrobe.add(leftDoor);

        const rightDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        rightDoor.position.set(2, 6, 1.2);
        wardrobe.add(rightDoor);

        // Position the wardrobe - moved further back for more space
        wardrobe.position.set(-7, 0, -10.5);
        this.scene.add(wardrobe);
    }

    createSkirting(length, position, rotation) {
        const skirtingGeometry = new THREE.BoxGeometry(length, 0.3, 0.1);
        const skirtingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x9b5523, // Warm wood tone
            roughness: 0.7,
            metalness: 0.1
        });
        const skirting = new THREE.Mesh(skirtingGeometry, skirtingMaterial);
        skirting.position.copy(position);
        skirting.position.y = 0.15;
        skirting.rotation.y = rotation;
        skirting.receiveShadow = true;
        skirting.castShadow = true;
        this.scene.add(skirting);
    }

    createWindow(xOffset = 0) {
        // Window frame with warm wood tone
        const frameGeometry = new THREE.BoxGeometry(5, 8, 0.3);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.7,
            metalness: 0.1
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(xOffset, 7, -11.9);
        frame.castShadow = true;
        this.scene.add(frame);

        // Window panes with slight blue tint for realism
        const glassGeometry = new THREE.PlaneGeometry(4.7, 7.7);
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0xc4e4ff,
            transparent: true,
            opacity: 0.2
        });
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.set(xOffset, 7, -11.8);
        this.scene.add(glass);

        // Window dividers
        this.createWindowDivider(xOffset, true);
        this.createWindowDivider(xOffset, false);
    }

    createWindowDivider(xOffset, isVertical) {
        const dividerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.7,
            metalness: 0.1
        });
        const geometry = isVertical
            ? new THREE.BoxGeometry(0.1, 7.7, 0.1)
            : new THREE.BoxGeometry(4.7, 0.1, 0.1);
        
        const divider = new THREE.Mesh(geometry, dividerMaterial);
        divider.position.set(xOffset, 7, -11.7);
        this.scene.add(divider);
    }
}
