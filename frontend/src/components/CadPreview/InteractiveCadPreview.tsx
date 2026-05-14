import React, { useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationArrow, faPlus } from "@fortawesome/free-solid-svg-icons";
import "./InteractiveCadPreview.scss";

type CadTool = "select" | "point" | "line" | "circle";

type CadCoord = {
    x: number;
    y: number;
};

type CadPoint = CadCoord & {
    id: string;
};

type CadLine = {
    id: string;
    start: CadCoord;
    end: CadCoord;
};

type CadCircle = {
    id: string;
    center: CadCoord;
    radius: number;
};

type PendingShape =
    | { tool: "line"; start: CadCoord }
    | { tool: "circle"; center: CadCoord };

const VIEW_BOX = {
    minX: -4.7,
    maxX: 4.7,
    minY: -2.2,
    maxY: 2.2,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snap = (value: number) => Number(value.toFixed(1));

const distance = (start: CadCoord, end: CadCoord) => {
    return Math.hypot(end.x - start.x, end.y - start.y);
};

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const iconPath = (name: string) => `/cad-icons/${name}`;

const toolButtons: Array<{ tool: CadTool; label: string; icon: string }> = [
    {
        tool: "select",
        label: "Select",
        icon: iconPath("cursorTool.png"),
    },
    {
        tool: "point",
        label: "Point",
        icon: iconPath("point.png"),
    },
    {
        tool: "line",
        label: "Line",
        icon: iconPath("line.png"),
    },
    {
        tool: "circle",
        label: "Circle",
        icon: iconPath("circleByRadius.svg"),
    },
];

const InteractiveCadPreview: React.FC = () => {
    const surfaceRef = useRef<HTMLDivElement | null>(null);
    const [activeTool, setActiveTool] = useState<CadTool>("select");
    const [cursor, setCursor] = useState<CadCoord>({ x: 0, y: 0 });
    const [pending, setPending] = useState<PendingShape | null>(null);
    const [points, setPoints] = useState<CadPoint[]>([]);
    const [lines, setLines] = useState<CadLine[]>([]);
    const [circles, setCircles] = useState<CadCircle[]>([]);

    const xLabels = useMemo(() => [-4, -3, -2, -1, 0, 1, 2, 3, 4], []);
    const yLabels = useMemo(() => [-2, -1, 1, 2], []);

    const toPercent = (coord: CadCoord) => {
        const x = ((coord.x - VIEW_BOX.minX) / (VIEW_BOX.maxX - VIEW_BOX.minX)) * 100;
        const y = ((VIEW_BOX.maxY - coord.y) / (VIEW_BOX.maxY - VIEW_BOX.minY)) * 100;

        return { x, y };
    };

    const pointerToCoord = (event: React.PointerEvent<HTMLDivElement>): CadCoord | null => {
        const bounds = surfaceRef.current?.getBoundingClientRect();
        if (!bounds) return null;

        const percentX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
        const percentY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);

        return {
            x: snap(VIEW_BOX.minX + percentX * (VIEW_BOX.maxX - VIEW_BOX.minX)),
            y: snap(VIEW_BOX.maxY - percentY * (VIEW_BOX.maxY - VIEW_BOX.minY)),
        };
    };

    const setTool = (tool: CadTool) => {
        setActiveTool(tool);
        setPending(null);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const coord = pointerToCoord(event);
        if (coord) setCursor(coord);
    };

    const handleSurfaceClick = (event: React.PointerEvent<HTMLDivElement>) => {
        const coord = pointerToCoord(event);
        if (!coord || activeTool === "select") return;

        setCursor(coord);

        if (activeTool === "point") {
            setPoints((current) => [...current, { ...coord, id: makeId("point") }]);
            return;
        }

        if (activeTool === "line") {
            if (pending?.tool !== "line") {
                setPending({ tool: "line", start: coord });
                return;
            }

            setLines((current) => [...current, { id: makeId("line"), start: pending.start, end: coord }]);
            setPending(null);
            return;
        }

        if (activeTool === "circle") {
            if (pending?.tool !== "circle") {
                setPending({ tool: "circle", center: coord });
                return;
            }

            const radius = distance(pending.center, coord);
            if (radius > 0.05) {
                setCircles((current) => [...current, { id: makeId("circle"), center: pending.center, radius }]);
            }
            setPending(null);
        }
    };

    const drawPoint = (point: CadCoord, className = "cad-shape-point") => {
        const position = toPercent(point);

        return <circle className={className} cx={`${position.x}%`} cy={`${position.y}%`} r="4.5" />;
    };

    const drawLine = (line: Pick<CadLine, "start" | "end">, className = "cad-shape-line") => {
        const start = toPercent(line.start);
        const end = toPercent(line.end);

        return (
            <line
                className={className}
                x1={`${start.x}%`}
                y1={`${start.y}%`}
                x2={`${end.x}%`}
                y2={`${end.y}%`}
            />
        );
    };

    const drawCircle = (circle: Pick<CadCircle, "center" | "radius">, className = "cad-shape-circle") => {
        const center = toPercent(circle.center);
        const radiusX = (circle.radius / (VIEW_BOX.maxX - VIEW_BOX.minX)) * 100;

        return <circle className={className} cx={`${center.x}%`} cy={`${center.y}%`} r={`${radiusX}%`} />;
    };

    return (
        <section className="cad-shell cad-animate-in" aria-label="Interactive CAD preview">
            <div className="cad-window-bar">
                <nav className="cad-menu" aria-label="CAD menu">
                    {["Project", "Collaboration", "Version control"].map((item) => (
                        <button key={item} type="button">
                            {item}
                            <img alt="" className="cad-menu-chevron" src={iconPath("ChevronDown.ico")} />
                        </button>
                    ))}
                    <button type="button">Help</button>
                </nav>

                <div className="cad-window-actions" aria-hidden="true">
                    <img alt="" src={iconPath("settings.svg")} />
                    <span className="cad-window-tile" />
                    <img alt="" src={iconPath("minimize.png")} />
                    <img alt="" src={iconPath("maximize.png")} />
                    <img alt="" src={iconPath("close.png")} />
                </div>
            </div>

            <div className="cad-toolbar" aria-label="Drawing tools">
                {toolButtons.map((button) => (
                    <button
                        aria-pressed={activeTool === button.tool}
                        className={activeTool === button.tool ? "is-active" : ""}
                        key={button.tool}
                        onClick={() => setTool(button.tool)}
                        title={button.label}
                        type="button"
                    >
                        <img alt="" className="cad-tool-img" src={button.icon} />
                    </button>
                ))}

                <span className="cad-toolbar-divider" />
                <button type="button" title="Dimension">
                    <img alt="" className="cad-tool-img" src={iconPath("sizeTool.svg")} />
                </button>
                <button type="button" title="Constraint">
                    <img alt="" className="cad-tool-img" src={iconPath("pointPointDist.svg")} />
                </button>
                <button type="button" title="Parallel">
                    <img alt="" className="cad-tool-img" src={iconPath("lineLineParallel.svg")} />
                </button>
                <button type="button" title="Add">
                    <FontAwesomeIcon icon={faPlus} />
                </button>
                <button type="button" title="Arc">
                    <img alt="" className="cad-tool-img" src={iconPath("arc3points.svg")} />
                </button>
            </div>

            <div className="cad-workspace">
                <div
                    className={`cad-grid cad-tool-${activeTool}`}
                    onPointerDown={handleSurfaceClick}
                    onPointerMove={handlePointerMove}
                    ref={surfaceRef}
                    role="application"
                >
                    <div className="cad-axis-x" />
                    <div className="cad-axis-y" />

                    {xLabels.map((value) => {
                        const position = toPercent({ x: value, y: 0 });

                        return (
                            <span
                                className={`cad-label cad-x-label ${value === 0 ? "cad-origin-label" : ""}`}
                                key={`x-${value}`}
                                style={{ left: `${position.x}%`, top: "50%" }}
                            >
                                {value}
                            </span>
                        );
                    })}

                    {yLabels.map((value) => {
                        const position = toPercent({ x: 0, y: value });

                        return (
                            <span
                                className="cad-label cad-y-label"
                                key={`y-${value}`}
                                style={{ left: "50%", top: `${position.y}%` }}
                            >
                                {value}
                            </span>
                        );
                    })}

                    <svg className="cad-shapes" aria-hidden="true">
                        {lines.map((line) => <React.Fragment key={line.id}>{drawLine(line)}</React.Fragment>)}
                        {circles.map((circle) => <React.Fragment key={circle.id}>{drawCircle(circle)}</React.Fragment>)}
                        {points.map((point) => <React.Fragment key={point.id}>{drawPoint(point)}</React.Fragment>)}

                        {pending?.tool === "line" && drawLine({ start: pending.start, end: cursor }, "cad-shape-line cad-shape-preview")}
                        {pending?.tool === "circle" && drawCircle({ center: pending.center, radius: distance(pending.center, cursor) }, "cad-shape-circle cad-shape-preview")}
                        {pending?.tool === "line" && drawPoint(pending.start, "cad-shape-point cad-shape-anchor")}
                        {pending?.tool === "circle" && drawPoint(pending.center, "cad-shape-point cad-shape-anchor")}
                    </svg>
                </div>

                <div className="cad-command-bar">
                    <span>
                        {pending
                            ? pending.tool === "line"
                                ? "Pick line end"
                                : "Pick circle radius"
                            : activeTool === "select"
                                ? "Select tool"
                                : `Draw ${activeTool}`}
                        {" "}X {cursor.x.toFixed(1)} / Y {cursor.y.toFixed(1)}
                    </span>
                    <FontAwesomeIcon icon={faLocationArrow} />
                </div>
            </div>
        </section>
    );
};

export default InteractiveCadPreview;
