import * as Phaser from "phaser";
import { Scene } from 'phaser';
import { playerAnimations } from "../constants/animations";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Interactible {
    id: number;

    x: number;
    y: number;

    // for the place to make the character sit
    centerX: number;
    centerY: number;

    width: number;
    height: number;

    type: string;
    facing: Direction;
    prompt: string;
    radius: number;

    multiUse: boolean;
    isInUse: boolean;
}

type OfficeLayers = {
    groundLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
}


export class Office extends Scene {
    map: Phaser.Tilemaps.Tilemap;
    tilesets: Map<string, Phaser.Tilemaps.Tileset[]>;
    player: Phaser.Physics.Arcade.Sprite;
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    lastDirection: Direction = "DOWN";
    interactibles: Interactible[] = [];
    prompt: string = "";
    playerState: "IDLE" | "WALK" | "SIT";
    interactKey?: Phaser.Input.Keyboard.Key;
    proximityHighlight?: Phaser.GameObjects.Rectangle;
    objectCollisionGroup?: Phaser.Physics.Arcade.StaticGroup;

    private loadAnimations() {
        playerAnimations.forEach((animation) => {
            if (this.anims.exists(animation.key)) {
                return;
            }

            this.anims.create({
                key: animation.key,
                frames: this.anims.generateFrameNumbers("alex", {
                    start: animation.start,
                    end: animation.end,
                }),
                frameRate: 8,
                repeat: -1,
            });

            console.log(
                animation.key,
                this.anims.exists(animation.key)
            );
        });
    }

    private loadPlayer() {
        this.player = this.physics.add.sprite(5 * 32, 5 * 32, 'alex', 0);
        this.player.setOrigin(0.5, 1);
        this.player.setScale(2);
        this.player.setDepth(10);
        this.player.setVelocity(0);

        this.player.body?.setSize(10, 5);
        this.player.body?.setOffset(3, 27);
    }

    private searchProximity(): (Interactible | null) {
        const playerX = this.player.x;
        const playerY = this.player.y;

        const interactible = this.interactibles.find((obj) => {
            const inProximity =
                playerX >= obj.centerX - obj.radius &&
                playerX <= obj.centerX + obj.radius &&
                playerY >= obj.centerY - obj.radius &&
                playerY <= obj.centerY + obj.radius;

            return inProximity && (obj.multiUse || !obj.isInUse)
        })

        if (interactible) {
            this.prompt = interactible.prompt;

            if (!this.proximityHighlight) {
                this.proximityHighlight = this.add.rectangle(
                    interactible.centerX,
                    interactible.centerY,
                    interactible.width,
                    interactible.height,
                    0x60a5fa,
                    0.10,
                );

                this.proximityHighlight.setStrokeStyle(2, 0x60a5fa);
                this.proximityHighlight.setDepth(4);
            }

            this.proximityHighlight.setPosition(
                interactible.centerX,
                interactible.centerY
            );

            this.proximityHighlight.setSize(
                interactible.width,
                interactible.height
            );

            this.proximityHighlight.setVisible(true);

            return interactible
        };

        this.prompt = "";
        if (this.proximityHighlight) {
            this.proximityHighlight.setVisible(false);
        }
        return null;
    }

    constructor() {
        super('Office');
    }

    private loadMap(): Phaser.Tilemaps.Tilemap {
        return this.make.tilemap({ key: 'office-map' });
    }

    private loadTilesets() {
        try {
            const modernOfficeTileset = this.map.addTilesetImage(
                'Modern_Office_Black_Shadow',
                'modern-office-shadow'
            )
            const rbOfficeTileset = this.map.addTilesetImage(
                'Room_Builder_Office',
                'room-builder-office'
            )
            const rbFloorsTileset = this.map.addTilesetImage(
                'Room_Builder_Floors',
                'room-builder-floors',
            )
            const rbWallsTileset = this.map.addTilesetImage(
                'Room_Builder_Walls',
                'room-builder-walls',
            )

            if (
                !modernOfficeTileset ||
                !rbOfficeTileset ||
                !rbFloorsTileset ||
                !rbWallsTileset
            ) {
                throw new Error("could not load all the tilesets")
            }

            this.tilesets = new Map<string, Phaser.Tilemaps.Tileset[]>();
            this.tilesets.set('Floors', [rbOfficeTileset, rbFloorsTileset]);
            this.tilesets.set('Chairs', [modernOfficeTileset]);
            this.tilesets.set('Walls', [rbWallsTileset, rbOfficeTileset]);
        } catch (err) {
            alert(err);
        }
    }

    private loadChairLayer() {
        const chairLayer = this.map.getObjectLayer('Chair');
        if (chairLayer === null) {
            throw new Error("could not load the chair layer in the scene");
        }

        const chairTilesets = this.tilesets.get('Chairs');
        if (chairTilesets === undefined) throw new Error("could not find chairTilesets for the key 'Chairs'");

        chairLayer.objects.forEach((obj) => {
            if (obj.gid === undefined) return;
            const frameIndex = obj.gid - chairTilesets[0].firstgid;

            if (obj.x === undefined || obj.y === undefined) return;
            const chair = this.add.image(
                obj.x,
                obj.y,
                'modern-office-shadow',
                frameIndex,
            )


            chair.setOrigin(0, 1);
            chair.setDepth(chair.y - 8);
        })
    }

    private loadWallLayer() {
        const wallLayer = this.map.getObjectLayer('Wall');
        if (wallLayer === null) {
            throw new Error("could not load the wall layer");
        }

        const wallTilesets = this.tilesets.get('Walls');
        if (wallTilesets === undefined) throw new Error("could not find wallTilesets for the key 'Walls'")
        const sortedTilesets = [...wallTilesets].sort(
            (a, b) => a.firstgid - b.firstgid
        );

        this.objectCollisionGroup = this.physics.add.staticGroup();

        wallLayer.objects.forEach((obj) => {
            if (obj.gid === undefined || obj.x === undefined || obj.y === undefined) return;

            const tileset = sortedTilesets.find((ts, index) => {
                const next = sortedTilesets[index + 1];

                const start = ts.firstgid;
                const end = next ? next.firstgid : Infinity;

                return obj.gid! >= start && obj.gid! < end;
            });

            if (!tileset) {
                console.warn("No tileset found for wall gid:", obj.gid);
                return;
            }

            const frameIndex = obj.gid - tileset.firstgid;

            let textureKey: string;

            if (tileset.name === 'Room_Builder_Walls') {
                textureKey = 'room-builder-walls';
            } else if (tileset.name === 'Room_Builder_Office') {
                textureKey = 'room-builder-office';
            } else {
                console.warn("Unknown wall tileset:", tileset.name);
                return;
            }

            const wall = this.add.image(
                obj.x,
                obj.y,
                textureKey,
                frameIndex
            );


            wall.setOrigin(0, 1);
            wall.setDepth(wall.y);
        })
    }

    private loadLayers(): OfficeLayers {
        const map = this.map;
        const ts = this.tilesets;
        const groundLayer = map.createLayer('Ground Layer', ts.get('Floors')!, 0, 0);

        if (!groundLayer) {
            throw new Error("could not load the layers")
        }
        groundLayer.setCollisionByProperty({ "collides": true });
        groundLayer.renderDebug(this.add.graphics(), {
            tileColor: null,
            collidingTileColor: new Phaser.Display.Color(255, 0, 0, 180),
            faceColor: new Phaser.Display.Color(0, 255, 0, 255),
        });

        this.loadChairLayer();
        this.loadWallLayer();

        return {
            groundLayer
        }
    }

    private setLayerDepths(layers: OfficeLayers) {
        layers.groundLayer?.setDepth(0);
    }

    private setUpCamera() {
        this.cameras.main.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        this.cameras.main.setZoom(2);
        this.cameras.main.startFollow(this.player);
    }

    private setUpInputs() {
        this.cursors = this.input.keyboard?.createCursorKeys();
        this.interactKey = this.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );
    }

    create() {
        try {
            this.map = this.loadMap();
            this.loadTilesets();


            const layers = this.loadLayers();
            if (!layers) {
                console.log("could not load the layers of the map")
                return;
            }

            this.loadPlayer();

            this.physics.add.collider(this.player, layers.groundLayer);

            this.setLayerDepths(layers);


            this.setUpCamera();

            this.loadAnimations();
            this.setUpInputs();
        }
        catch (e) {
            alert(e)
        }
    }

    update(_time: number) {
        if (!this.cursors) {
            return;
        }

        this.player.setDepth(this.player.y)

        const speed = 160;
        this.player.setVelocity(0);

        if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            this.lastDirection = "DOWN";
            this.playerState = "WALK";
        } else if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.lastDirection = "LEFT";
            this.playerState = "WALK";
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.lastDirection = "RIGHT";
            this.playerState = "WALK";
        } else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            this.lastDirection = "UP";
            this.playerState = "WALK";
        } else {
            this.player.setVelocity(0);
            if (this.playerState !== "SIT") {
                this.playerState = "IDLE";
            }
        }

        const interactible = this.searchProximity();
        if (interactible) {
            if (Phaser.Input.Keyboard.JustDown(this.interactKey!)) {
                this.player.x = interactible.centerX;
                this.player.y = interactible.centerY;
                this.lastDirection = interactible.facing;
                this.playerState = "SIT";
            }
        }

        this.player.anims.play(`alex-${this.playerState.toLowerCase()}-${this.lastDirection.toLowerCase()}`, true)
        //console.log(`alex-${this.playerState.toLowerCase()}-${this.lastDirection.toLowerCase()}`)
    }

    changeScene() {

    }
}
