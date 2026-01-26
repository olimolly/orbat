import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function MotorizedRecon({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
    return (
        <svg className={className} aria-label={title} role="img" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
            id="a" data-name="Units" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 192">
            <g id="f" data-name="Armored-Recon">
                <g id="g" data-name="_x3C_Rectangle_x3E__fond">
                    <rect y="0" width="256" height="192" fill={bg} />
                </g>
                <g id="h" data-name="_x3C_Rectangle_x3E__rectangle_int.">
                    <rect x="8" y="8" width="240" height="176" fill="none" />
                </g>
                <g id="i" data-name="_x3C_Ecrêter_le_groupe_x3E__Motorized_recon">
                    <line x1="248" y1="8" x2="8" y2="184" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="8" />
                    <line x1="128" y1="8" x2="128" y2="184" fill="none" stroke={shape} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="8" />
                </g>
                <g id="j" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
            </g>
        </svg>
    );
}
