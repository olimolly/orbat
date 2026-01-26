import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function AntiAir({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
    return (
        <svg className={className} aria-label={title} role="img" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
            id="a" data-name="Units" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 192">
            <g id="l" data-name="Anti-Air">
                <g id="m" data-name="_x3C_Rectangle_x3E__fond">
                    <rect x="0" width="256" height="192" fill={bg} />
                </g>
                <g id="n" data-name="_x3C_Rectangle_x3E__rectangle_int.">
                    <rect x="8" y="8" width="240" height="176" fill="none" />
                </g>
                <g id="p" data-name="_x3C_Tracé_x3E__Anti-Air">
                    <path d="M8,184h0c71.426-52.379,168.574-52.379,240,0h0" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="8" />
                </g>
                <g id="o" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
            </g>
        </svg>
    );
}
