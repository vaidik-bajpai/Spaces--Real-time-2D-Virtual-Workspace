import * as Phaser from "phaser";
import { Scene } from 'phaser';
import { playerAnimations, playerSprites } from "../constants/animations";
import { EventBus } from "../EventBus";
import { MainMenuData } from "../../components/MainMenu";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Chair {
    x: number;
    y: number;

    width: number;
    height: number;

    sitX: number;
    sitY: number;

    proximityX: number;
    proximityY: number;

    facing: Direction;
    radius: number;
    prompt: string;
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
    chairs: Chair[] = [];
    playerPrompt: string = "";
    promptAlert: Phaser.GameObjects.Text
    playerState: "IDLE" | "WALK" | "SIT";
    interactKey?: Phaser.Input.Keyboard.Key;
    proximityHighlight?: Phaser.GameObjects.Rectangle;
    objectCollisionGroup: Phaser.Physics.Arcade.StaticGroup;
    selectedSpriteKey: string

    private loadAnimations() {
        playerSprites.forEach((spriteKey) => {
            playerAnimations.forEach((animation) => {
                if (this.anims.exists(`${spriteKey}-${animation.action}-${animation.direction}`)) {
                    return;
                }

                this.anims.create({
                    key: `${spriteKey}-${animation.action}-${animation.direction}`,
                    frames: this.anims.generateFrameNumbers(spriteKey, {
                        start: animation.start,
                        end: animation.end,
                    }),
                    frameRate: 8,
                    repeat: -1,
                });

                console.log(
                    `${spriteKey}-${animation.action}-${animation.direction}`,
                    this.anims.exists(`${spriteKey}-${animation.action}-${animation.direction}`)
                );
            });
        })

    }

    private loadPlayer(spriteName: string) {
        this.selectedSpriteKey = spriteName

        this.player = this.physics.add.sprite(5 * 32, 5 * 32, spriteName, 0);
        this.player.setOrigin(0.5, 1);
        this.player.setScale(2);
        this.player.setDepth(10);
        this.player.setVelocity(0);

        this.player.body?.setSize(10, 5);
        this.player.body?.setOffset(3, 27);
    }

    private searchProximity(): Chair | null {
        for (const chair of this.chairs) {
            const radiusPx = chair.radius * 32;

            const left = chair.proximityX - radiusPx;
            const right = chair.proximityX + radiusPx;
            const up = chair.proximityY - radiusPx;
            const down = chair.proximityY + radiusPx;

            if (
                this.player.x >= left &&
                this.player.x <= right &&
                this.player.y >= up &&
                this.player.y <= down
            ) {
                return chair;
            }
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

            const props: Record<string, any> = {};
            obj.properties.map((prop: any) => {
                props[prop.name] = prop.value;
            })

            const sitX = obj.x + (props.sitOffsetX ?? obj.width! / 2);
            const sitY = obj.y + (props.sitOffsetY ?? -20);

            const proximityX = sitX;
            const proximityY = sitY;

            this.chairs.push({
                x: obj.x,
                y: obj.y,

                width: obj.width!,
                height: obj.height!,

                sitX,
                sitY,

                proximityX,
                proximityY,

                facing: props.facing ?? "DOWN",
                radius: props.radius ?? 1,
                prompt: props.prompt ?? "Press E to sit",
            });

            chair.setOrigin(0, 1);
            chair.setDepth(chair.y - 16);
        })

        console.log("chair metadata: ", this.chairs);
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

    private loadWallCollideLayer() {
        const wallLayer = this.map.getObjectLayer('WallCollide');
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

            if (tileset.name === 'Room_Builder_Walls') {
                textureKey = 'room-builder-walls';
            } else if (tileset.name === 'Room_Builder_Office') {
                textureKey = 'room-builder-office';
            } else {
                console.warn("Unknown wall tileset:", tileset.name);
                return;
            }

            const wall = this.objectCollisionGroup.create(
                obj.x,
                obj.y,
                textureKey,
                frameIndex
            );



            wall.setOrigin(0, 1);
            wall.setDepth(-1);
            wall.refreshBody();
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
        this.loadWallCollideLayer();

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

    private spawnPlayer(spriteName: string) {
        this.loadPlayer(spriteName)
        this.physics.add.collider(this.player, this.objectCollisionGroup);

        this.promptAlert = this.add.text(this.player.x, this.player.y - 32, "", {
            fontSize: "8px",
            color: "#ffffff",
            backgroundColor: "#111827",
            padding: {
                x: 6,
                y: 3,
            },
        });
        this.promptAlert.setOrigin(0.5, 1);
        this.promptAlert.setDepth(9999);
        this.promptAlert.setVisible(false);

        this.setUpCamera();
        this.setUpInputs();
        this.loadAnimations();
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

            EventBus.on("player:join", (data: MainMenuData) => {
                console.log(data.username);
                console.log(data.spriteName);
                console.log(data.textureKey);
                this.spawnPlayer(data.textureKey)
            });
            this.cameras.main.setZoom(2);
            this.setLayerDepths(layers);
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
        this.promptAlert.setPosition(
            this.player.x,
            this.player.y - 50
        );

        const speed = 160;
        this.player.setVelocity(0);

        if (this.playerState !== "SIT") {
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
                this.playerState = "IDLE";
            }
        }

        const chair = this.playerState !== "SIT" ? this.searchProximity() : null;
        if (chair !== null) {
            console.log("In the proximity of a chair")
            this.playerPrompt = chair.prompt
            if (Phaser.Input.Keyboard.JustDown(this.interactKey!)) {
                this.player.x = chair.sitX;
                this.player.y = chair.sitY;
                this.playerState = "SIT";
                this.lastDirection = chair.facing;
                this.playerPrompt = "Press E to get up";
            }
        } else {
            if (this.playerState !== "SIT") {
                this.promptAlert.setVisible(false);
                this.playerPrompt = "";
            }
        }

        if (this.playerState === "SIT" && Phaser.Input.Keyboard.JustDown(this.interactKey!)) {
            this.playerState = "IDLE";
        }

        this.player.anims.play(`${this.selectedSpriteKey}-${this.playerState.toLowerCase()}-${this.lastDirection.toLowerCase()}`, true)
        if (this.playerPrompt) {
            this.promptAlert.setText(this.playerPrompt);
            this.promptAlert.setVisible(true);
        } else {
            this.promptAlert.setVisible(false);
        }
    }

    changeScene() {

    }
}
