import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function Infantry({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
    return (
        <svg className={className} aria-label={title} role="img" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
            id="a" data-name="Units" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 192">
            <g id="d" data-name="Infantry">
                <g id="e" data-name="_x3C_Rectangle_x3E__fond">
                    <rect width="256" height="192" fill={bg} />
                </g>
                <g id="f" data-name="_x3C_Rectangle_x3E__rectangle_int.">
                    <rect x="8" y="8" width="240" height="176" fill="none" />
                </g>
                <g>
                    <line x1="8" y1="8" x2="248" y2="184" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="8" />
                    <line x1="247.852" y1="8.125" x2="8" y2="184" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="8" />
                </g>
                <g id="g" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
            </g>
        </svg>

    );
}
