import { OrbatSVGProps } from "@/lib/orbat/svg-types";

export default function UAVAir({ bg = "#b3d9ff", stroke = "#111827", shape = "#111827", className, title }: OrbatSVGProps) {
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
                <g id="r" data-name="_x3C_Tracé_x3E__UAV_air">
                    <path d="M128,90.53c-2.684,0-5.263-.816-7.458-2.36l-54.239-38.161,57.482,10.142c1.387.245,2.805.369,4.214.369s2.828-.124,4.215-.369l57.481-10.142-54.239,38.161c-2.195,1.544-4.773,2.36-7.458,2.36Z" fill={shape} fillRule="evenodd" />
                    <path d="M197.599,52.676h.005-.005M83.286,57.067l39.804,7.023c1.616.285,3.268.43,4.91.43s3.293-.145,4.91-.43l39.804-7.023-39.558,27.832c-1.518,1.068-3.3,1.632-5.156,1.632s-3.638-.564-5.156-1.632l-39.558-27.831M196.663,44.757c-.146,0-.298.013-.453.041l-64.69,11.414c-1.164.205-2.342.308-3.52.308s-2.355-.103-3.52-.308l-64.69-11.414c-.156-.028-.307-.041-.453-.041-2.196,0-3.263,2.945-1.322,4.311l60.226,42.373c2.927,2.059,6.343,3.089,9.759,3.089s6.832-1.03,9.759-3.089l60.226-42.373c1.942-1.366.875-4.311-1.322-4.311h0Z" fill={shape} />
                </g>
                <g id="m" data-name="_x3C_Rectangle_x3E__bord_ext._contour">
                    <path d="M248,8v176H8V8h240M256,0H0v192h256V0h0Z" fill={stroke} />
                </g>
            </g>
        </svg>
    );
}
