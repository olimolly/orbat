import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function UAV({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
    return (
        <svg className={className} aria-label={title} role="img" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
            id="a" data-name="Units" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 192">
            <g id="j" data-name="UAV">
                <g id="k" data-name="_x3C_Rectangle_x3E__fond">
                    <rect x="0" width="256" height="192" fill={bg} />
                </g>
                <g id="l" data-name="_x3C_Rectangle_x3E__rectangle_int.">
                    <rect x="8" y="8" width="240" height="176" fill="none" />
                </g>
                <g>
                    <path d="M128,123.63c-3.636,0-7.128-1.106-10.102-3.198l-72.914-51.3,77.847,13.735c1.702.3,3.441.452,5.169.452s3.467-.152,5.169-.452l77.847-13.735-72.914,51.3c-2.974,2.092-6.466,3.198-10.102,3.198Z" fill={shape} fillRule="evenodd" />
                    <path d="M216.081,72.3h.005-.005M194.033,76.19l-58.232,40.97c-2.296,1.615-4.993,2.469-7.8,2.469s-5.504-.854-7.8-2.469l-58.232-40.97,60.169,10.616c1.93.341,3.903.513,5.863.513s3.933-.173,5.863-.513l60.169-10.616M215.268,64.37c-.186,0-.378.017-.576.052l-82.218,14.506c-1.48.261-2.977.392-4.473.392s-2.994-.131-4.473-.392l-82.218-14.506c-.198-.035-.39-.052-.576-.052-2.791,0-4.147,3.743-1.68,5.48l76.544,53.853c3.72,2.617,8.062,3.926,12.404,3.926s8.683-1.309,12.404-3.926l76.544-53.853c2.468-1.737,1.112-5.48-1.68-5.48h0Z" fill={shape} />
                </g>
                <g id="m" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
            </g>
        </svg>
    );
}
