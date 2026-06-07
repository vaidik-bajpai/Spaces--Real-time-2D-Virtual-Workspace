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

    type: string;
    facing: Direction;
    prompt: string;
    radius: number;

    multiUse?: boolean;
    isInUse?: boolean;
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

            const rect = this.add.rectangle(
                obj.x + width / 2,
                obj.y + height / 2,
                obj.width,
                obj.height,
                0xff0000,
                0.35
            );

            rect.setDepth(1000);
            rect.setStrokeStyle(2, 0xff0000);

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
            }
        }).filter((obj) => obj !== null);
    }

    private searchProximity(): (Interactible | null) {
        const playerX = this.player.x;
        const playerY = this.player.y;

        const interactible = this.interactibles.find((obj) => {
            if (playerX >= obj.centerX - obj.radius && playerX <= obj.centerX + obj.radius && playerY >= obj.centerY - obj.radius && playerY <= obj.centerY + obj.radius) {
                this.prompt = obj.prompt;
                return obj;
            }
        })

        if (interactible) return interactible;

        this.prompt = "";
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

    create() {
        const map = this.make.tilemap({ key: 'office-map' });
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
            return
        }

        const groundLayer = map.createLayer('Ground', rbFreeTileset);
        const interiorLayer = map.createLayer('Interior', [modernOfficeTileset, intFreeTileset]);
        const itemsLayer = map.createLayer('Items', modernOfficeTileset);
        const tableLayer = map.createLayer('Table', modernOfficeTileset);
        const onTableLayer = map.createLayer('On Table', modernOfficeTileset)
        const behindTableLayer = map.createLayer('Behind Table', modernOfficeTileset);
        const inFrontTableLayer = map.createLayer('In Front Table', modernOfficeTileset);
        const wallsLayer = map.createLayer('Walls', rbFreeTileset);
        const bordersLayer = map.createLayer('Borders', rbFreeTileset);

        if (!groundLayer || !wallsLayer || !bordersLayer || !itemsLayer || !tableLayer || !onTableLayer || !behindTableLayer || !inFrontTableLayer || !wallsLayer || !bordersLayer) {
            console.log("could not load the map")
            return
        }

        groundLayer.setDepth(0);
        wallsLayer.setDepth(1);
        interiorLayer.setDepth(2);
        itemsLayer.setDepth(3);
        tableLayer.setDepth(4);
        onTableLayer.setDepth(5);
        behindTableLayer.setDepth(6);
        inFrontTableLayer.setDepth(7);
        bordersLayer.setDepth(8);

        this.player = this.physics.add.sprite(5 * 32, 5 * 32, 'alex', 0);
        this.player.setOrigin(0.5, 1);
        this.player.setScale(2);
        this.player.setDepth(10);
        this.player.setVelocity(0);

        this.player.body?.setSize(10, 5);
        this.player.body?.setOffset(3, 27);

        this.loadInteractibles(map);

        // Read rectangle objects from Tiled object layer
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

            this.physics.add.existing(rect, true);

            collisionGroup.add(rect);
        });

        this.physics.add.collider(this.player, collisionGroup);

        this.cameras.main.setBounds(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels
        );

        this.cameras.main.setZoom(2);
        this.cameras.main.startFollow(this.player);

        this.loadAnimations();
        this.cursors = this.input.keyboard?.createCursorKeys();
        this.interactKey = this.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );
    }

    update(_time: number) {
        if (!this.cursors) {
            return;
        }

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
        // console.log(`alex-${this.playerState.toLowerCase()}-${this.lastDirection.toLowerCase()}`)
    }

    changeScene() {

    }
}
