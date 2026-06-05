import { GameObjects, Scene } from 'phaser';

type PlayerDirectionType = "UP" | "DOWN" | "LEFT" | "RIGHT";

export class Office extends Scene {
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    player: GameObjects.Sprite;
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    lastDirection: PlayerDirectionType

    constructor() {
        super('Office');
        this.lastDirection = "DOWN";
    }

    create() {
        const map = this.make.tilemap({ key: 'office-map' });
        const tileset = map.addTilesetImage(
            'Room_Builder_free_32x32',
            'room-builder'
        )

        if (!tileset) {
            console.log("could not create tileset")
            return
        }

        const groundLayer = map.createLayer('Ground', tileset);
        const wallsLayer = map.createLayer('Walls', tileset);

        groundLayer?.setDepth(0);
        wallsLayer?.setDepth(1);

        this.player = this.add.sprite(5 * 32, 5 * 32, 'alex', 0);
        this.player.setOrigin(0.5, 1);
        this.player.setScale(2);
        this.player.setDepth(10);

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

    update(_time: number, delta: number) {
        if (!this.cursors) {
            return;
        }

        const speed = 120;
        const distance = speed * (delta / 1000);

        let moveX = 0;
        let moveY = 0;
        let animationKey = "";

        if (this.cursors.down.isDown) {
            moveY = 1;
            this.lastDirection = "DOWN";
            animationKey = 'alex-walk-down';
        } else if (this.cursors.left.isDown) {
            moveX = -1;
            this.lastDirection = "LEFT";
            animationKey = 'alex-walk-left';
        } else if (this.cursors.right.isDown) {
            moveX = 1;
            this.lastDirection = "RIGHT";
            animationKey = 'alex-walk-right';
        } else if (this.cursors.up.isDown) {
            moveY = -1;
            this.lastDirection = "UP";
            animationKey = 'alex-walk-up';
        }

        const isMoving = moveX !== 0 || moveY !== 0;
        if (isMoving) {
            // console.log(`alex is moving: ${`alex-walk-${this.lastDirection.toLowerCase()}`}`)

            this.player.x += moveX * distance;
            this.player.y += moveY * distance;
            this.player.play(animationKey, true)
        } else {
            this.player.play(`alex-idle-${this.lastDirection.toLowerCase()}`, true)
        }
    }

    changeScene() {

    }
}
