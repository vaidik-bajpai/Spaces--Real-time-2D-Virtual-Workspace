import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { EventBus } from "../game/EventBus";

const Avatars = [
    { spriteName: "Alex", textureKey: "alex" },
    { spriteName: "Adam", textureKey: "adam" },
    { spriteName: "Amelia", textureKey: "amelia" },
    { spriteName: "Bob", textureKey: "bob" },
];

export interface MainMenuData {
    spriteName: string;
    textureKey: "alex" | "adam" | "amelia" | "bob";
    username: string;
}

const MainMenu = () => {
    const [username, setUsername] = useState<string>("");
    const [avatarIndex, setAvatarIndex] = useState<number>(0);
    const [hasJoined, setHasJoined] = useState<boolean>(false);

    if (hasJoined) return null;

    return (
        <div className="fixed inset-0 w-screen h-screen grid place-items-center">
            <div className="flex flex-col gap-4 items-center rounded-2xl border border-white/15 bg-[#243748] p-6">
                <div className="text-white text-center font-bold text-lg">
                    Select your avatar
                </div>
                <div className="flex w-full text-white backdrop-blur-xl gap-4">
                    <div className="relative flex w-40 flex-col items-center justify-center rounded-xl bg-white p-4 text-black">
                        {avatarIndex > 0 && (
                            <ChevronLeft
                                className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer"
                                onClick={() => setAvatarIndex((prev) => prev - 1)}
                            />
                        )}

                        <div className="flex h-30 w-20 items-center justify-center">
                            <img
                                src={`/avatars/${Avatars[avatarIndex].spriteName}.png`}
                                alt={Avatars[avatarIndex].spriteName}
                                className="h-full w-full object-contain"
                            />
                        </div>

                        {avatarIndex < Avatars.length - 1 && (
                            <ChevronRight
                                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                                onClick={() => setAvatarIndex((prev) => prev + 1)}
                            />
                        )}

                        <div className="mt-2 font-bold">{Avatars[avatarIndex].spriteName}</div>
                    </div>
                    <div className="grow">
                        <div className="space-y-4">
                            <div className="relative rounded-xl border border-white/15 p-3">
                                <label className="mb-2 block text-sm">Full Name</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-lg bg-white/10 px-3 py-2 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    className="w-fit rounded-xl bg-white px-4 py-2 text-black font-bold"
                    onClick={
                        () => {
                            setHasJoined(true);
                            EventBus.emit("player:join", { ...Avatars[avatarIndex], username });
                        }}
                >
                    Enter
                </button>
            </div>
        </div >
    );
};

export default MainMenu;