import type { Plant } from '$lib/types';

let id = 0;
const p = (
	name: string,
	latin: string,
	icon: string,
	category: Plant['category'],
	sunMin: number,
	sunMax: number,
	sunLabel: string,
	description: string,
	spacing: number
): Plant => ({
	id: `plant-${id++}`,
	name,
	latin,
	icon,
	category,
	sunMin,
	sunMax,
	sunLabel,
	description,
	spacing
});

export const PLANTS: Plant[] = [
	// Vegetables
	p('Tomato', 'Solanum lycopersicum', '🍅', 'vegetable', 6, 14, 'Full sun', 'Needs warmth and consistent watering. Stake or cage for support.', 0.6),
	p('Zucchini', 'Cucurbita pepo', '🥒', 'vegetable', 6, 14, 'Full sun', 'Prolific producer. Give it room to spread.', 0.9),
	p('Pepper', 'Capsicum annuum', '🌶', 'vegetable', 6, 14, 'Full sun', 'Loves heat. Start indoors, transplant after last frost.', 0.5),
	p('Lettuce', 'Lactuca sativa', '🥬', 'vegetable', 3, 6, 'Partial shade', 'Prefers cool conditions. Bolts in full sun/heat.', 0.3),
	p('Spinach', 'Spinacia oleracea', '🥬', 'vegetable', 2, 5, 'Partial shade', 'Shade-tolerant. Best in spring/autumn.', 0.2),
	p('Carrot', 'Daucus carota', '🥕', 'vegetable', 5, 14, 'Full sun', 'Loose, deep soil. Thin seedlings early.', 0.1),
	p('Radish', 'Raphanus sativus', '🔴', 'vegetable', 4, 8, 'Partial–Full', 'Fast grower (3–4 weeks). Good for inter-cropping.', 0.1),
	p('Beans (green)', 'Phaseolus vulgaris', '🫘', 'vegetable', 6, 14, 'Full sun', 'Fix nitrogen in soil. Bush or pole varieties.', 0.3),
	p('Peas', 'Pisum sativum', '🫛', 'vegetable', 4, 8, 'Partial–Full', 'Cool-season. Provide trellis for climbing types.', 0.15),
	p('Kale', 'Brassica oleracea', '🥗', 'vegetable', 3, 7, 'Partial–Full', 'Very hardy. Flavor improves after frost.', 0.4),
	p('Swiss Chard', 'Beta vulgaris', '🥬', 'vegetable', 3, 7, 'Partial–Full', 'Tolerates shade well. Colorful stems.', 0.3),
	p('Cucumber', 'Cucumis sativus', '🥒', 'vegetable', 6, 14, 'Full sun', 'Needs consistent moisture. Trellis saves space.', 0.5),
	p('Eggplant', 'Solanum melongena', '🍆', 'vegetable', 6, 14, 'Full sun', 'Heat lover. Protect from wind.', 0.6),
	p('Potato', 'Solanum tuberosum', '🥔', 'vegetable', 6, 14, 'Full sun', 'Hill up soil as plants grow.', 0.4),

	// Fruits
	p('Strawberry', 'Fragaria × ananassa', '🍓', 'fruit', 6, 14, 'Full sun', 'Groundcover. Runners spread quickly.', 0.3),
	p('Raspberry', 'Rubus idaeus', '🫐', 'fruit', 5, 10, 'Partial–Full', 'Cane fruit. Needs support structure.', 0.6),
	p('Blueberry', 'Vaccinium corymbosum', '🫐', 'fruit', 4, 8, 'Partial–Full', 'Needs acidic soil (pH 4.5–5.5). Mulch well.', 1.2),
	p('Fig', 'Ficus carica', '🌳', 'fruit', 6, 14, 'Full sun', 'Mediterranean. Protect from hard frost.', 3.0),
	p('Lemon', 'Citrus limon', '🍋', 'fruit', 6, 14, 'Full sun', 'Can grow in pots. Bring inside in winter (north of zone 9).', 2.5),
	p('Apple', 'Malus domestica', '🍎', 'fruit', 6, 14, 'Full sun', 'Needs pollination partner. Many dwarf varieties.', 3.0),
	p('Grape', 'Vitis vinifera', '🍇', 'fruit', 6, 14, 'Full sun', 'Train on trellis or pergola. Prune hard in winter.', 2.0),

	// Herbs
	p('Basil', 'Ocimum basilicum', '🌿', 'herb', 6, 14, 'Full sun', 'Pinch flowers to extend harvest.', 0.25),
	p('Mint', 'Mentha', '🌿', 'herb', 2, 6, 'Partial shade', 'Invasive — grow in containers! Shade-tolerant.', 0.3),
	p('Parsley', 'Petroselinum crispum', '🌿', 'herb', 3, 7, 'Partial–Full', 'Biennial. Tolerates some shade.', 0.25),
	p('Rosemary', 'Salvia rosmarinus', '🌿', 'herb', 6, 14, 'Full sun', 'Mediterranean native. Excellent drainage needed.', 0.6),
	p('Thyme', 'Thymus vulgaris', '🌿', 'herb', 6, 14, 'Full sun', 'Groundcover herb. Very drought-tolerant.', 0.3),
	p('Chives', 'Allium schoenoprasum', '🌿', 'herb', 4, 8, 'Partial–Full', 'Perennial. Pretty purple flowers.', 0.2),
	p('Coriander', 'Coriandrum sativum', '🌿', 'herb', 3, 6, 'Partial shade', 'Bolts in heat. Successive sowings.', 0.15),
	p('Oregano', 'Origanum vulgare', '🌿', 'herb', 6, 14, 'Full sun', 'Perennial spreader. Great dried.', 0.3),
	p('Sage', 'Salvia officinalis', '🌿', 'herb', 6, 14, 'Full sun', 'Woody perennial. Good drainage essential.', 0.5),

	// Flowers
	p('Lavender', 'Lavandula', '💜', 'flower', 6, 14, 'Full sun', 'Drought-tolerant. Attracts pollinators.', 0.5),
	p('Sunflower', 'Helianthus annuus', '🌻', 'flower', 6, 14, 'Full sun', 'Annual. Tracks the sun when young.', 0.4),
	p('Marigold', 'Tagetes', '🌼', 'flower', 6, 14, 'Full sun', 'Companion plant — deters pests.', 0.25),
	p('Hosta', 'Hosta', '🌱', 'flower', 1, 3, 'Shade', 'Classic shade plant. Slug-prone.', 0.5),
	p('Fern', 'Polypodiopsida', '🌿', 'flower', 1, 3, 'Shade', 'Loves moisture and deep shade.', 0.4),
	p('Impatiens', 'Impatiens walleriana', '🌺', 'flower', 1, 4, 'Shade', 'Classic shade bedding plant. Vivid colors.', 0.3),
	p('Geranium', 'Pelargonium', '🌺', 'flower', 5, 14, 'Full sun', 'Easy and long-flowering. Deadhead regularly.', 0.35),
	p('Rose', 'Rosa', '🌹', 'flower', 6, 14, 'Full sun', 'Feed and prune regularly. Many varieties.', 0.8),

	// Shrubs
	p('Hydrangea', 'Hydrangea', '💙', 'shrub', 3, 6, 'Partial shade', 'Color varies with soil pH. Morning sun best.', 1.2),
	p('Boxwood', 'Buxus', '🌳', 'shrub', 2, 8, 'Partial–Full', 'Classic hedge plant. Shade-tolerant.', 0.5),
	p('Rhododendron', 'Rhododendron', '🌺', 'shrub', 2, 5, 'Partial shade', 'Acidic soil. Spectacular spring blooms.', 1.5),
	p('Camellia', 'Camellia japonica', '🌸', 'shrub', 2, 5, 'Partial shade', 'Evergreen. Winter/spring blooms.', 1.5),
	p('Forsythia', 'Forsythia', '🌼', 'shrub', 6, 14, 'Full sun', 'Early spring yellow blooms. Fast grower.', 1.5),
	p('Holly', 'Ilex', '🌳', 'shrub', 3, 8, 'Partial–Full', 'Evergreen with winter berries. Male + female needed.', 1.5),
];
