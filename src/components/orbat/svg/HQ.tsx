import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function HQ({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
    return (
        <svg className={className} aria-label={title} role="img" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
            id="a" data-name="Units" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 288">
            <g id="n" data-name="HQ">
                <g id="o" data-name="_x3C_Rectangle_x3E__fond">
                    <rect width="256" height="192" fill={bg} />
                </g>
                <g id="p" data-name="_x3C_Rectangle_x3E__rectangle_int.">
                    <rect x="8" y="8" width="240" height="176" fill="none" />
                </g>
                <g id="q" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
                <g id="r" data-name="_x3C_Tracé_x3E__HQ">
                    <polygon points="8 184 0 184 0 288 8 288 8 184 8 184" fill={shape} />
                </g>
            </g>
        </svg>
    );
}
