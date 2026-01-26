import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function Helicopter({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
    return (
        <svg className={className} aria-label={title} role="img" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
            id="a" data-name="Units" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 192">
            <g id="h" data-name="Helicopter">
                <g id="i" data-name="_x3C_Rectangle_x3E__fond">
                    <rect x="0" y="0" width="256" height="192" fill={bg} />
                </g>
                <g id="j" data-name="_x3C_Rectangle_x3E__rectangle_int.">
                    <rect x="8" y="8" width="240" height="176" fill="none" />
                </g>
                <g id="k" data-name="_x3C_Helicopter_x3E_">
                    <path d="M136.159,96l67.841-38.16v76.32l-67.841-38.16ZM52,57.84l67.841,38.16-67.841,38.16V57.84Z" fill={shape} fillRule="evenodd" />
                    <path d="M200,64.679v62.642l-55.682-31.321,55.682-31.321M56,64.679l55.682,31.321-55.682,31.321v-62.642M208,51l-80,45,80,45V51h0ZM48,51v90l80-45L48,51h0Z" fill={shape} />
                </g>
                <g id="l" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
            </g>
        </svg>
    );
}
