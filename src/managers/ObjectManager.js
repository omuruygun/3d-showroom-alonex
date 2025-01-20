import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ObjectManager {
    constructor() {
        this.objects = [];
        this.gltfLoader = new GLTFLoader();
        this.previewMesh = null;
        this.selectedObject = null;
        this.outlineMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2
        });
        this.selectionOutline = null;
        this.actionButtonsContainer = null;
        this.camera = null; // Will be set by SceneManager
    }

    setCamera(camera) {
        this.camera = camera;
    }

    createObject(blockType, position) {
        return new Promise((resolve) => {
            if (blockType.type === 'geometry') {
                const mesh = this.createGeometryObject(blockType);
                const height = this.getObjectHeight(mesh);
                position.y = height / 2 + 0.01; // Add small offset to prevent z-fighting
                mesh.position.copy(position);
                resolve(mesh);
            } else if (blockType.isGLB) {
                this.createGLBObject(blockType, position).then(resolve);
            }
        });
    }

    getObjectHeight(object) {
        const bbox = new THREE.Box3().setFromObject(object);
        return bbox.max.y - bbox.min.y;
    }

    createGeometryObject(blockType) {
        const geometry = this.createGeometry(blockType);
        const material = new THREE.MeshStandardMaterial({
            color: blockType.color || 0xcccccc,
            metalness: 0.3,
            roughness: 0.4,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.type = 'geometry';
        mesh.userData.isInteractive = true;

        return mesh;
    }

    createGeometry(blockType) {
        switch (blockType.geometry) {
            case 'cube':
                return new THREE.BoxGeometry(
                    blockType.size.width,
                    blockType.size.height,
                    blockType.size.depth
                );
            case 'sphere':
                return new THREE.SphereGeometry(blockType.size.radius, 32, 32);
            case 'cylinder':
                return new THREE.CylinderGeometry(
                    blockType.size.radius,
                    blockType.size.radius,
                    blockType.size.height,
                    32
                );
            default:
                throw new Error(`Unknown geometry type: ${blockType.geometry}`);
        }
    }

    createGLBObject(blockType, position) {
        return new Promise((resolve) => {
            this.gltfLoader.load(blockType.path, (gltf) => {
                const container = new THREE.Group();
                container.userData.type = 'glb';
                container.userData.isInteractive = true;

                const model = gltf.scene;
                
                // Apply initial scale
                const defaultScale = 3; // Increased from 1 to 2.5
                model.scale.setScalar(blockType.scale ? blockType.scale * defaultScale : defaultScale);
                // Update world matrix to ensure correct positions
                model.updateWorldMatrix(true, true);
                
                // Create a new group for the processed model
                const processedGroup = new THREE.Group();
                
                // Process all meshes
                model.traverse((node) => {
                    if (node.isMesh) {
                        // Clone the mesh to preserve materials
                        const clonedMesh = node.clone();
                        
                        // Get world position and apply it
                        const worldPos = new THREE.Vector3();
                        node.getWorldPosition(worldPos);
                        clonedMesh.position.copy(worldPos);
                        
                        // Get world quaternion and apply it
                        const worldQuat = new THREE.Quaternion();
                        node.getWorldQuaternion(worldQuat);
                        clonedMesh.quaternion.copy(worldQuat);
                        
                        // Get world scale and apply it
                        const worldScale = new THREE.Vector3();
                        node.getWorldScale(worldScale);
                        clonedMesh.scale.copy(worldScale);
                        
                        // Setup shadows
                        clonedMesh.castShadow = true;
                        clonedMesh.receiveShadow = true;
                        
                        // Enhance materials
                        if (clonedMesh.material) {
                            clonedMesh.material = clonedMesh.material.clone();
                            
                            // Handle glass materials
                            if (clonedMesh.material.name.toLowerCase().includes('glass')) {
                                clonedMesh.material.transparent = true;
                                clonedMesh.material.opacity = 0.6; // More visible glass
                                clonedMesh.material.roughness = 0;
                                clonedMesh.material.metalness = 0.9;
                                clonedMesh.material.envMapIntensity = 2.0;
                                clonedMesh.material.side = THREE.DoubleSide;
                            } else if (clonedMesh.material.name.toLowerCase().includes('white') || 
                                     clonedMesh.material.color.getHexString() === 'ffffff') {
                                // Enhance white materials
                                clonedMesh.material.metalness = 0.1;
                                clonedMesh.material.roughness = 0.3;
                                clonedMesh.material.envMapIntensity = 1.2;
                            } else {
                                // Default material enhancement
                                clonedMesh.material.metalness = 0.2;
                                clonedMesh.material.roughness = 0.4;
                                clonedMesh.material.envMapIntensity = 1.0;
                            }
                            
                            // Ensure materials update
                            clonedMesh.material.needsUpdate = true;
                        }
                        
                        processedGroup.add(clonedMesh);
                    }
                });
                
                // Calculate bounding box
                const bbox = new THREE.Box3().setFromObject(processedGroup);
                const center = bbox.getCenter(new THREE.Vector3());
                
                // Center the processed group
                processedGroup.position.set(-center.x, -bbox.min.y, -center.z);
                
                // Add to container
                container.add(processedGroup);
                
                // Position container if specified
                if (position) {
                    container.position.copy(position);
                }

                resolve(container);
            });
        });
    }

    createPreview(blockType) {
        return this.createGLBObject(blockType, new THREE.Vector3(0, 0, 0)).then(preview => {
            if (this.previewMesh) {
                this.removePreview();
            }
            
            preview.traverse((child) => {
                if (child.isMesh) {
                    const material = child.material.clone();
                    material.transparent = true;
                    material.opacity = 0.5;
                    child.material = material;
                }
            });
            
            this.previewMesh = preview;
            return preview;
        });
    }

    selectObject(object) {
        if (this.selectedObject === object) {
            return; // Already selected
        }

        // Clear previous selection
        this.clearSelection();

        if (object) {
            this.selectedObject = object;
            
            // Create selection outline
            const box = new THREE.Box3().setFromObject(object);
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            
            box.getCenter(center);
            box.getSize(size);
            
            // Create simple box outline
            const outlineGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            const edges = new THREE.EdgesGeometry(outlineGeometry);
            const outline = new THREE.LineSegments(edges, this.outlineMaterial);
            
            // Position outline relative to object's center
            outline.position.copy(center).sub(object.position);
            outline.userData.isOutline = true;
            
            // Add outline to the object
            object.add(outline);
            this.selectionOutline = outline;

            // Show action buttons
            this.showActionButtons(object);
        }
    }

    clearSelection() {
        if (this.selectedObject) {
            // Remove outline
            if (this.selectionOutline) {
                this.selectionOutline.removeFromParent();
                this.selectionOutline = null;
            }
            this.selectedObject = null;
            this.hideActionButtons();
        }
    }

    showActionButtons(object) {
        // Remove existing rotation text
        const existingText = document.querySelector('.rotation-text');
        if (existingText) {
            existingText.remove();
        }

        // Create action buttons container if it doesn't exist
        if (!this.actionButtonsContainer) {
            this.actionButtonsContainer = document.createElement('div');
            this.actionButtonsContainer.style.position = 'absolute';
            this.actionButtonsContainer.style.display = 'flex';
            this.actionButtonsContainer.style.gap = '10px';
            this.actionButtonsContainer.style.padding = '8px';
            this.actionButtonsContainer.style.background = 'rgba(0, 0, 0, 0.7)';
            this.actionButtonsContainer.style.borderRadius = '4px';
            this.actionButtonsContainer.style.zIndex = '1000';

            // Create buttons
            const configureButton = this.createActionButton('Configure', () => this.configureObject(object));
            const cloneButton = this.createActionButton('Clone', () => this.cloneObject(object));
            const deleteButton = this.createActionButton('Delete', () => this.deleteObject(object));

            this.actionButtonsContainer.appendChild(configureButton);
            this.actionButtonsContainer.appendChild(cloneButton);
            this.actionButtonsContainer.appendChild(deleteButton);

            document.body.appendChild(this.actionButtonsContainer);
        }

        // Update position immediately and start animation loop
        this.updateActionButtonsPosition();
        if (!this.animationFrameId) {
            const animate = () => {
                this.updateActionButtonsPosition();
                this.animationFrameId = requestAnimationFrame(animate);
            };
            animate();
        }
    }

    createActionButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.padding = '6px 12px';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.backgroundColor = '#4a4a4a';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.2s';
        
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#666666';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#4a4a4a';
        });
        
        button.addEventListener('click', onClick);
        return button;
    }

    hideActionButtons() {
        if (this.actionButtonsContainer) {
            this.actionButtonsContainer.remove();
            this.actionButtonsContainer = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    updateActionButtonsPosition() {
        if (this.selectedObject && this.actionButtonsContainer && this.camera) {
            const box = new THREE.Box3().setFromObject(this.selectedObject);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            // Add offset to position above the object
            center.y = box.max.y + 0.5; // Add 0.5 units above the object
            
            // Convert 3D position to screen coordinates
            const screenPosition = center.clone().project(this.camera);
            const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;
            
            // Update container position
            this.actionButtonsContainer.style.left = `${x - this.actionButtonsContainer.offsetWidth / 2}px`;
            this.actionButtonsContainer.style.top = `${y}px`;
            
            // Check if object is behind the camera
            const isBehindCamera = screenPosition.z > 1;
            this.actionButtonsContainer.style.display = isBehindCamera ? 'none' : 'flex';
        }
    }

    configureObject(object) {
        if (object) {
            object.userData.isConfigurable = true;
            object.userData.isCloneable = true;
            object.userData.isDeletable = true;
        }
    }

    cloneObject(object) {
        if (object) {
            const clone = object.clone();
            this.configureObject(clone);
            return clone;
        }
        return null;
    }

    deleteObject(object) {
        if (object) {
            this.sceneManager.removeObject(object);
        }
    }

    addObject(object) {
        this.objects.push(object);
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
        if (object === this.selectedObject) {
            this.deselectObject();
        }
    }

    clearObjects() {
        // Clear selection first
        this.clearSelection();
        
        // Clear the objects array
        this.objects = [];
    }

    checkCollision(object1, object2) {
        const box1 = new THREE.Box3().setFromObject(object1);
        const box2 = new THREE.Box3().setFromObject(object2);
        return box1.intersectsBox(box2);
    }

    deselectObject() {
        this.selectedObject = null;
    }
}
