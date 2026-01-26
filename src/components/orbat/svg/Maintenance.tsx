import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function Maintenance({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
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
                <g id="z" data-name="_x3C_Groupe_x3E__Maintenance">
                    <g id="aa" data-name="_x3C_Tracé_x3E__Supply">
                        <polyline points="81.937 96 81.938 96 173.937 96 173.937 96" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="12" />
                    </g>
                    <g id="ab" data-name="_x3C_Tracé_x3E__Supply">
                        <path d="M199.76,68h0s-25.822,0-25.822,28,25.822,28,25.822,28h0" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="12" />
                    </g>
                    <g id="ac" data-name="_x3C_Tracé_x3E__Supply">
                        <path d="M56.115,68h0s25.822,0,25.822,28-25.822,28-25.822,28h0" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="12" />
                    </g>
                </g>
                <g id="o" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
            </g>
        </svg>
    );
}
