import * as Phaser from "phaser";
import { GameObjects, Scene } from 'phaser';
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

type OfficeTilesets = {
    rbFreeTileset: Phaser.Tilemaps.Tileset;
    modernOfficeTileset: Phaser.Tilemaps.Tileset;
    intFreeTileset: Phaser.Tilemaps.Tileset;
};

type OfficeLayers = {
    groundLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    interiorLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    itemsLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    tableLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    onTableLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    behindTableLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    inFrontTableLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    wallsLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
    bordersLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer
}


export class Office extends Scene {
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    player: Phaser.Physics.Arcade.Sprite;
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    lastDirection: Direction = "DOWN";
    interactibles: Interactible[] = [];
    prompt: string = "";
    playerState: "IDLE" | "WALK" | "SIT";
    interactKey?: Phaser.Input.Keyboard.Key;
    proximityHighlight?: Phaser.GameObjects.Rectangle;
    depthSprites: Phaser.GameObjects.Sprite[] = [];

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

    private loadInteractibles(map: Phaser.Tilemaps.Tilemap) {
        const objectLayer = map.getObjectLayer('Couch')

        if (!objectLayer) {
            console.log("could not load the object layer: Couch");
            return;
        }

        this.interactibles = objectLayer.objects.map((obj) => {
            const props = this.getTiledProperties(obj.properties);
            const width = obj.width;
            const height = obj.height;

            if (!obj.x || !obj.y || !width || !height) {
                return null;
            }

            return {
                id: obj.id,
                type: props.type,
                x: obj.x,
                y: obj.y,
                width: width,
                height: height,
                centerX: obj.x + (width / 2),
                centerY: obj.y + (height / 2),
                facing: props.facing,
                prompt: props.prompt,
                radius: props.radius,
                multiUse: props.multiUse ?? false,
                isInUse: props.inUse ?? false
            }
        }).filter((obj) => obj !== null);
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

    private getTiledProperties(
        properties: Phaser.Types.Tilemaps.TiledObject["properties"]
    ): Record<string, any> {
        const result: Record<string, any> = {};

        if (!properties) return result;

        for (const prop of properties) {
            result[prop.name] = prop.value;
        }

        return result;
    }

    constructor() {
        super('Office');
    }

    private loadMap(): Phaser.Tilemaps.Tilemap {
        return this.make.tilemap({ key: 'office-map' });
    }

    private loadTilesets(map: Phaser.Tilemaps.Tilemap): OfficeTilesets | null {
        const rbFreeTileset = map.addTilesetImage(
            'Room_Builder_free_32x32',
            'room-builder-free'
        )
        const modernOfficeTileset = map.addTilesetImage(
            'Modern_Office_Black_Shadow',
            'modern-office-shadow'
        )
        const intFreeTileset = map.addTilesetImage(
            'Interiors_free_32x32',
            'interior-free',
        )

        if (!rbFreeTileset || !modernOfficeTileset || !intFreeTileset) {
            console.log("could not create tileset")
            return null
        }

        return {
            rbFreeTileset,
            modernOfficeTileset,
            intFreeTileset,
        }
    }

    private loadLayers(map: Phaser.Tilemaps.Tilemap, ts: OfficeTilesets): OfficeLayers | null {
        const groundLayer = map.createLayer('Ground', ts.rbFreeTileset);
        const interiorLayer = map.createLayer('Interior', [ts.modernOfficeTileset, ts.intFreeTileset]);
        const itemsLayer = map.createLayer('Items', ts.modernOfficeTileset);
        const tableLayer = map.createLayer('Table', ts.modernOfficeTileset);
        const onTableLayer = map.createLayer('On Table', ts.modernOfficeTileset)
        const behindTableLayer = map.createLayer('Behind Table', ts.modernOfficeTileset);
        const inFrontTableLayer = map.createLayer('In Front Table', ts.modernOfficeTileset);
        const wallsLayer = map.createLayer('Walls', ts.rbFreeTileset);
        const bordersLayer = map.createLayer('Borders', ts.rbFreeTileset);

        if (!groundLayer || !wallsLayer || !bordersLayer || !itemsLayer || !tableLayer || !onTableLayer || !behindTableLayer || !inFrontTableLayer || !wallsLayer || !bordersLayer || !interiorLayer) {
            return null
        }

        return {
            groundLayer,
            interiorLayer,
            itemsLayer,
            tableLayer,
            onTableLayer,
            behindTableLayer,
            inFrontTableLayer,
            wallsLayer,
            bordersLayer,
        }
    }

    private setLayerDepths(layers: OfficeLayers) {
        layers.groundLayer.setDepth(0);
        layers.wallsLayer.setDepth(1);
        layers.interiorLayer.setDepth(2);
        layers.itemsLayer.setDepth(3);
        layers.tableLayer.setDepth(4);
        layers.onTableLayer.setDepth(5);
        layers.behindTableLayer.setDepth(6);
        layers.inFrontTableLayer.setDepth(7);
        layers.bordersLayer.setDepth(8);
    }

    private loadDepthLayer(
        map: Phaser.Tilemaps.Tilemap,
        tilesets: {
            tileset: Phaser.Tilemaps.Tileset;
            textureKey: string;
        }[]
    ) {
        const depthLayer = map.getObjectLayer("Depth");

        if (!depthLayer) {
            console.log("could not load the object layer: Depth");
            return;
        }

        depthLayer.objects.forEach((obj) => {
            if (!obj.gid || obj.x === undefined || obj.y === undefined) {
                return;
            }

            const gid = this.clearTiledGidFlags(obj.gid);

            const matchedTileset = [...tilesets]
                .reverse()
                .find(({ tileset }) => gid >= tileset.firstgid);

            if (!matchedTileset) {
                console.log("could not find tileset for gid:", gid);
                return;
            }

            const frame = gid - matchedTileset.tileset.firstgid;

            const width = obj.width ?? 32;
            const height = obj.height ?? 32;

            const sprite = this.add.sprite(
                obj.x + width / 2,
                obj.y,
                matchedTileset.textureKey,
                frame
            );

            sprite.setOrigin(0.5, 1);
            sprite.setDepth(sprite.y);

            this.depthSprites.push(sprite);
        });
    }

    private clearTiledGidFlags(gid: number) {
        const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
        const FLIPPED_VERTICALLY_FLAG = 0x40000000;
        const FLIPPED_DIAGONALLY_FLAG = 0x20000000;
        const ROTATED_HEXAGONAL_120_FLAG = 0x10000000;

        return (
            gid &
            ~(
                FLIPPED_HORIZONTALLY_FLAG |
                FLIPPED_VERTICALLY_FLAG |
                FLIPPED_DIAGONALLY_FLAG |
                ROTATED_HEXAGONAL_120_FLAG
            )
        );
    }

    private loadCollisionLayer(map: Phaser.Tilemaps.Tilemap) {
        const collisionLayer = map.getObjectLayer("Object");

        if (!collisionLayer) {
            console.log("could not load Object collision layer");
            return;
        }

        const collisionGroup = this.physics.add.staticGroup();

        collisionLayer.objects.forEach((object) => {
            if (
                object.x === undefined ||
                object.y === undefined ||
                object.width === undefined ||
                object.height === undefined
            ) {
                return;
            }

            const rect = this.add.rectangle(
                object.x + object.width / 2,
                object.y + object.height / 2,
                object.width,
                object.height,
                0xff0000,
                0.35
            );

            rect.setDepth(object.y);

            this.physics.add.existing(rect, true);

            collisionGroup.add(rect);
        });

        this.physics.add.collider(this.player, collisionGroup);
    }

    private setUpCamera(map: Phaser.Tilemaps.Tilemap) {
        this.cameras.main.setBounds(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels
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
        const map = this.loadMap();

        const tilesets = this.loadTilesets(map);
        if (!tilesets) {
            console.log("could not load the tilesets for the map")
            return;
        }

        const layers = this.loadLayers(map, tilesets);
        if (!layers) {
            console.log("could not load the layers of the map")
            return;
        }

        this.setLayerDepths(layers);

        this.loadDepthLayer(map, [
            {
                tileset: tilesets.modernOfficeTileset,
                textureKey: "modern-office-shadow-sheet",
            },
        ]);

        this.loadPlayer();
        this.loadInteractibles(map);

        this.loadCollisionLayer(map);
        this.setUpCamera(map);

        this.loadAnimations();
        this.setUpInputs();
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
