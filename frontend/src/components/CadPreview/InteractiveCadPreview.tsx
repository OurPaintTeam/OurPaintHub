import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faComments,
    faEllipsisVertical,
    faGear,
    faImage,
    faLocationArrow,
    faMinus,
    faMousePointer,
    faPlus,
    faSquare,
    faTableColumns,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";

type CadPoint = {
    id: string;
    name: string;
    x: number;
    y: number;
};

const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
};

const InteractiveCadPreview: React.FC = () => {
    const surfaceRef = useRef<HTMLDivElement | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [points, setPoints] = useState<CadPoint[]>([
        { id: "h5", name: "H5", x: 51.2, y: 74.5 },
        { id: "p2", name: "P2", x: 43.0, y: 32.0 },
        { id: "n7", name: "N7", x: 66.0, y: 57.0 },
    ]);

    const movePoint = (event: React.PointerEvent, id: string) => {
        const bounds = surfaceRef.current?.getBoundingClientRect();
        if (!bounds) return;

        const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 2, 98);
        const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 3, 97);

        setPoints((current) =>
            current.map((point) => (point.id === id ? { ...point, x, y } : point)),
        );
    };

    const handlePointerDown = (event: React.PointerEvent, id: string) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setActiveId(id);
        movePoint(event, id);
    };

    const handlePointerMove = (event: React.PointerEvent, id: string) => {
        if (activeId !== id) return;
        movePoint(event, id);
    };

    const activePoint = points.find((point) => point.id === activeId) ?? points[0];
    const coordX = (((activePoint.x - 50) / 2.65) + 0.05).toFixed(1);
    const coordY = (((50 - activePoint.y) / 3.8) - 0.05).toFixed(1);

    return (
        <section className="cad-shell cad-animate-in overflow-hidden rounded-[4px] border border-[#2c2830] bg-[#4b4451]">
            <div className="flex h-9 items-center justify-between border-b border-[#2f2b33] bg-[#4a4650] px-5 text-[13px] font-semibold text-[#ded6eb]">
                <div className="flex items-center gap-9">
                    {["Project", "Collaboration"].map((item) => (
                        <button key={item} className="flex items-center gap-1 hover:text-white" type="button">
                            {item}
                            <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 text-[#aa85cf]" />
                        </button>
                    ))}
                    <button className="hover:text-white" type="button">Help</button>
                </div>
                <div className="flex items-center gap-5 text-[#d9d2e8]">
                    <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 rotate-180 text-[#aa85cf]" />
                    <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
                    <FontAwesomeIcon icon={faMinus} className="h-4 w-4" />
                    <FontAwesomeIcon icon={faSquare} className="h-4 w-4" />
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                </div>
            </div>

            <div className="flex h-8 items-end gap-1 bg-[#4f4955] pl-16">
                <div className="flex h-8 items-center gap-4 rounded-t-[4px] bg-[#9b879c] px-4 text-[12px] text-[#efe7f0]">
                    <span>projects.ourp</span>
                    <span className="text-[#e7dce9]">×</span>
                </div>
                <button className="flex h-7 w-7 items-center justify-center rounded-t-[4px] bg-[#6a5f70] text-[#e6ddea]" type="button">
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                </button>
            </div>

            <div className="flex bg-[#9b879c] p-0">
                <aside className="flex w-16 shrink-0 flex-col items-center gap-5 bg-[#4e4854] pt-4">
                    <span className="cad-tool-icon rounded-[2px]">
                        <FontAwesomeIcon icon={faTableColumns} />
                    </span>
                    <span className="cad-tool-icon">
                        <FontAwesomeIcon icon={faComments} />
                    </span>
                    <span className="cad-tool-icon">
                        <FontAwesomeIcon icon={faImage} />
                    </span>
                    <span className="cad-tool-icon">
                        <FontAwesomeIcon icon={faMousePointer} className="-rotate-45" />
                    </span>
                    <span className="cad-tool-icon">
                        <FontAwesomeIcon icon={faGear} />
                    </span>
                </aside>

                <div className="min-w-0 flex-1 p-4 pl-5">
                    <div
                        ref={surfaceRef}
                        className="cad-grid relative h-[360px] overflow-hidden border border-[#e7e3e6] bg-white sm:h-[440px] lg:h-[506px]"
                    >
                        <div className="cad-axis-x" />
                        <div className="cad-axis-y" />

                        {[-20, -15, -10, -5, 5, 10, 15, 20].map((value) => (
                            <span
                                key={`x-${value}`}
                                className="cad-label cad-x-label"
                                style={{ left: `${50 + value * 2.3}%`, top: "50.9%" }}
                            >
                                {value.toFixed(1)}
                            </span>
                        ))}

                        {[
                            { value: 10, top: "1%" },
                            { value: 5, top: "24%" },
                            { value: -5, top: "70%" },
                            { value: -10, top: "93%" },
                        ].map((label) => (
                            <span
                                key={`y-${label.value}`}
                                className="cad-label cad-y-label"
                                style={{ left: "50.4%", top: label.top }}
                            >
                                {label.value.toFixed(1)}
                            </span>
                        ))}

                        {points.map((point) => (
                            <React.Fragment key={point.id}>
                                <button
                                    aria-label={`${point.name} CAD point`}
                                    className="cad-point"
                                    onPointerDown={(event) => handlePointerDown(event, point.id)}
                                    onPointerMove={(event) => handlePointerMove(event, point.id)}
                                    onPointerUp={() => setActiveId(null)}
                                    onPointerCancel={() => setActiveId(null)}
                                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                    type="button"
                                />
                                <span
                                    className="cad-drag-label"
                                    style={{ left: `calc(${point.x}% - 10px)`, top: `calc(${point.y}% - 22px)` }}
                                >
                                    {point.name}
                                    <br />
                                    X: {(((point.x - 50) / 2.65) + 0.05).toFixed(1)}, Y: {(((50 - point.y) / 3.8) - 0.05).toFixed(1)}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="flex h-9 items-center justify-between rounded-b-[3px] border border-[#222] bg-[#333333] px-4 text-[12px] text-[#c7c2c9]">
                        <span>{activePoint.name}: X {coordX} / Y {coordY}</span>
                        <FontAwesomeIcon icon={faLocationArrow} className="h-5 w-5 rotate-45 text-[#bbb3c4]" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default InteractiveCadPreview;
