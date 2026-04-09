// ============================================================
// FitSole Parametric Insole - OpenSCAD Template (D-10)
// Generated via Jinja2 from DesignParams
// ============================================================

// --- Design Parameters (injected from DesignParams) ---
arch_height = {{ arch_height }};
heel_cup_depth = {{ heel_cup_depth }};
eva_cushion_thickness = {{ eva_cushion_thickness }};
foot_length = {{ foot_length }};
foot_width = {{ foot_width }};
heel_width = {{ heel_width }};
forefoot_flex = {{ forefoot_flex }};
medial_post_h = {{ medial_post_h }};
lateral_post_h = {{ lateral_post_h }};

// --- Rendering Resolution ---
$fn = {{ resolution }};

// --- Derived Dimensions ---
base_thickness = 3;
arch_length = foot_length * 0.35;
arch_start = foot_length * 0.25;
heel_length = foot_length * 0.25;
forefoot_start = foot_length * 0.65;
forefoot_length = foot_length * 0.35;
toe_taper = 0.7;

// ============================================================
// Module: Base Plate
// Foot outline approximated as hull of ellipses
// ============================================================
module base_plate() {
    hull() {
        // Heel section - narrower ellipse
        translate([0, heel_width / 4, 0])
            scale([heel_length / 2, heel_width / 2, 1])
                cylinder(h = base_thickness, r = 1);

        // Midfoot section - full width
        translate([foot_length * 0.45, 0, 0])
            scale([foot_length * 0.15, foot_width / 2, 1])
                cylinder(h = base_thickness, r = 1);

        // Forefoot section - slightly narrower
        translate([foot_length * 0.75, 0, 0])
            scale([foot_length * 0.15, foot_width * 0.45, 1])
                cylinder(h = base_thickness, r = 1);

        // Toe section - tapered
        translate([foot_length * 0.92, 0, 0])
            scale([foot_length * 0.08, foot_width * toe_taper * 0.35, 1])
                cylinder(h = base_thickness, r = 1);
    }
}

// ============================================================
// Module: Heel Cup
// Cylindrical wall around the heel area
// ============================================================
module heel_cup() {
    difference() {
        // Outer wall
        translate([0, heel_width / 4, 0])
            scale([heel_length / 2, heel_width / 2 + 2, 1])
                cylinder(h = heel_cup_depth, r = 1);

        // Inner cavity
        translate([0, heel_width / 4, base_thickness])
            scale([heel_length / 2 - 2, heel_width / 2 - 2, 1])
                cylinder(h = heel_cup_depth, r = 1);
    }
}

// ============================================================
// Module: Arch Support
// Raised section in medial midfoot area
// ============================================================
module arch_support() {
    translate([arch_start, -foot_width * 0.15, base_thickness])
        hull() {
            // Arch start
            translate([0, 0, 0])
                scale([arch_length * 0.3, foot_width * 0.2, 1])
                    cylinder(h = arch_height * 0.5, r = 1);

            // Arch peak
            translate([arch_length * 0.5, 0, 0])
                scale([arch_length * 0.3, foot_width * 0.25, 1])
                    cylinder(h = arch_height, r = 1);

            // Arch end
            translate([arch_length, 0, 0])
                scale([arch_length * 0.2, foot_width * 0.15, 1])
                    cylinder(h = arch_height * 0.3, r = 1);
        }
}

// ============================================================
// Module: EVA Cushion Layer
// Uniform thickness below the base plate
// ============================================================
module eva_cushion() {
    translate([0, 0, -eva_cushion_thickness])
        hull() {
            // Replicate base plate footprint at cushion depth
            translate([0, heel_width / 4, 0])
                scale([heel_length / 2, heel_width / 2, 1])
                    cylinder(h = eva_cushion_thickness, r = 1);

            translate([foot_length * 0.45, 0, 0])
                scale([foot_length * 0.15, foot_width / 2, 1])
                    cylinder(h = eva_cushion_thickness, r = 1);

            translate([foot_length * 0.75, 0, 0])
                scale([foot_length * 0.15, foot_width * 0.45, 1])
                    cylinder(h = eva_cushion_thickness, r = 1);

            translate([foot_length * 0.92, 0, 0])
                scale([foot_length * 0.08, foot_width * toe_taper * 0.35, 1])
                    cylinder(h = eva_cushion_thickness, r = 1);
        }
}

// ============================================================
// Module: Medial Post
// Raised edge on the medial (inner) side for pronation correction
// ============================================================
module medial_post() {
    if (medial_post_h > 0) {
        translate([arch_start, -foot_width * 0.3, base_thickness])
            hull() {
                translate([0, 0, 0])
                    cube([arch_length, 3, medial_post_h]);
                translate([arch_length * 0.2, -2, 0])
                    cube([arch_length * 0.6, 1, medial_post_h * 0.5]);
            }
    }
}

// ============================================================
// Module: Lateral Post
// Raised edge on the lateral (outer) side
// ============================================================
module lateral_post() {
    if (lateral_post_h > 0) {
        translate([arch_start, foot_width * 0.25, base_thickness])
            hull() {
                translate([0, 0, 0])
                    cube([arch_length, 3, lateral_post_h]);
                translate([arch_length * 0.2, 2, 0])
                    cube([arch_length * 0.6, 1, lateral_post_h * 0.5]);
            }
    }
}

// ============================================================
// Module: Forefoot Flex Zone
// Thinner material in forefoot controlled by forefoot_flex
// ============================================================
module forefoot_flex_zone() {
    flex_reduction = base_thickness * forefoot_flex * 0.6;
    if (flex_reduction > 0) {
        translate([forefoot_start, -foot_width * 0.35, base_thickness - flex_reduction])
            cube([forefoot_length * 0.6, foot_width * 0.7, flex_reduction + 0.01]);
    }
}

// ============================================================
// Final Assembly
// ============================================================
difference() {
    union() {
        // 1. Base plate
        base_plate();

        // 2. Heel cup
        heel_cup();

        // 3. Arch support
        arch_support();

        // 4. EVA cushion layer
        eva_cushion();

        // 5. Medial post
        medial_post();

        // 6. Lateral post
        lateral_post();
    }

    // 7. Subtract forefoot flex zone (thinner material)
    forefoot_flex_zone();
}
