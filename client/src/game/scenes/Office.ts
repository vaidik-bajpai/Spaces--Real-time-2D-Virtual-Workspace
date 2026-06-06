import * as Phaser from "phaser";
import { GameObjects, Scene } from 'phaser';

type PlayerDirectionType = "UP" | "DOWN" | "LEFT" | "RIGHT";

export class Office extends Scene {
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    player: Phaser.Physics.Arcade.Sprite;
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    lastDirection: PlayerDirectionType

    constructor() {
        super('Office');
        this.lastDirection = "DOWN";
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

        this.player.body?.setSize(10, 5);
        this.player.body?.setOffset(3, 27);

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

            // Make this visible while debugging.
            // Later change alpha from 0.35 to 0.
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

        this.anims.create({
            key: 'alex-walk-down',
            frames: this.anims.generateFrameNames('alex', {
                start: 66,
                end: 71,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.anims.create({
            key: 'alex-walk-right',
            frames: this.anims.generateFrameNames('alex', {
                start: 48,
                end: 53,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.anims.create({
            key: 'alex-walk-up',
            frames: this.anims.generateFrameNames('alex', {
                start: 54,
                end: 59,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.anims.create({
            key: 'alex-walk-left',
            frames: this.anims.generateFrameNames('alex', {
                start: 60,
                end: 65,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.anims.create({
            key: 'alex-idle-left',
            frames: this.anims.generateFrameNames('alex', {
                start: 36,
                end: 41,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.anims.create({
            key: 'alex-idle-up',
            frames: this.anims.generateFrameNames('alex', {
                start: 30,
                end: 35,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.anims.create({
            key: 'alex-idle-down',
            frames: this.anims.generateFrameNames('alex', {
                start: 42,
                end: 47,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.anims.create({
            key: 'alex-idle-right',
            frames: this.anims.generateFrameNames('alex', {
                start: 24,
                end: 29,
            }),
            frameRate: 8,
            repeat: -1,
        })

        this.cursors = this.input.keyboard?.createCursorKeys();
    }

    update(_time: number) {
        if (!this.cursors) {
            return;
        }

        const speed = 120;

        this.player.setVelocity(0);

        let animationKey = "";

        if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            this.lastDirection = "DOWN";
            animationKey = 'alex-walk-down';
        } else if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.lastDirection = "LEFT";
            animationKey = 'alex-walk-left';
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.lastDirection = "RIGHT";
            animationKey = 'alex-walk-right';
        } else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            this.lastDirection = "UP";
            animationKey = 'alex-walk-up';
        }

        if (animationKey) {
            // console.log(`alex is moving: ${`alex-walk-${this.lastDirection.toLowerCase()}`}`)    
            this.player.play(animationKey, true)
        } else {
            this.player.play(`alex-idle-${this.lastDirection.toLowerCase()}`, true)
        }
    }

    changeScene() {

    }
}
