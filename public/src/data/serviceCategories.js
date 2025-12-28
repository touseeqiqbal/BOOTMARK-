// Service Categories Data Structure for BOOTMARK
// This defines all service categories, their services, and complexity tiers

export const SERVICE_CATEGORIES = [
  {
    id: 'lawn-turf-care',
    name: 'Lawn / Turf Care',
    services: [
      { id: 'lawn-mowing', name: 'Lawn mowing' },
      { id: 'trimming', name: 'Trimming / line trimming around obstacles (trees, posts, beds, fencing)' },
      { id: 'edging', name: 'Edging along sidewalks, driveways, and beds' },
      { id: 'blowing', name: 'Blowing / cleanup of clippings from hard surfaces' },
      { id: 'fertilization', name: 'Fertilization (granular or liquid)' },
      { id: 'weed-control', name: 'Weed control in lawn (spot treatment or blanket spray)' },
      { id: 'aeration', name: 'Aeration (core aeration)' },
      { id: 'overseeding', name: 'Overseeding' },
      { id: 'dethatching', name: 'Dethatching / power raking' },
      { id: 'topdressing', name: 'Topdressing (loam/compost over lawn)' },
      { id: 'lawn-repair', name: 'Lawn repair / patching (small areas)' },
      { id: 'sod-installation', name: 'New sod installation' }
    ],
    complexityTiers: [
      { id: 'basic', name: 'Tier 1 – Basic', description: 'normal growth, easy access, standard weekly/bi-weekly cut' },
      { id: 'moderate', name: 'Tier 2 – Moderate', description: 'slightly overgrown, slopes, obstacles, double-cut' },
      { id: 'heavy', name: 'Tier 3 – Heavy', description: 'very overgrown / first cut of season / tall grass, debris, multiple passes' }
    ]
  },
  {
    id: 'beds-gardens-mulch',
    name: 'Beds, Gardens & Mulch',
    services: [
      { id: 'bed-weeding', name: 'Bed weeding (hand weeding or hoeing)' },
      { id: 'bed-edging', name: 'Bed edging (spade or mechanical edger)' },
      { id: 'mulch-install', name: 'Mulch install (bark, woodchips, stone)' },
      { id: 'mulch-refresh', name: 'Mulch refresh / top-off' },
      { id: 'bed-cleanup', name: 'Bed cleanup (removing leaves, debris, dead plant material)' },
      { id: 'planting-annuals', name: 'Planting annuals' },
      { id: 'planting-perennials', name: 'Planting perennials' },
      { id: 'planting-shrubs', name: 'Planting shrubs' },
      { id: 'planting-trees', name: 'Planting small ornamental trees' },
      { id: 'deadheading', name: 'Deadheading (removing spent flowers)' },
      { id: 'staking', name: 'Staking / tying plants' },
      { id: 'soil-amending', name: 'Soil amending / compost added to beds' }
    ],
    complexityTiers: [
      { id: 'basic', name: 'Basic', description: 'light weed, quick edge touch-up, thin mulch top-off' },
      { id: 'standard', name: 'Standard', description: 'full weed, full edging, 1–2" mulch coverage' },
      { id: 'heavy', name: 'Heavy', description: 'beds completely overrun, deep weeding, shape restore, lots of mulch' }
    ]
  },
  {
    id: 'shrubs-hedges-trees',
    name: 'Shrubs, Hedges & Trees',
    services: [
      { id: 'shrub-trimming', name: 'Shrub trimming (formal hedges or natural shrubs)' },
      { id: 'tree-pruning', name: 'Ornamental tree pruning (small trees)' },
      { id: 'cutting-back', name: 'Cutting back overgrown shrubs away from house/walkways' },
      { id: 'selective-pruning', name: 'Selective pruning for shape and health' },
      { id: 'shrub-removal', name: 'Removal of small shrubs' },
      { id: 'tree-removal', name: 'Removal of small trees (under a certain diameter you choose)' },
      { id: 'brush-clearing', name: 'Brush clearing / scrub removal along edges/fencelines' },
      { id: 'sucker-removal', name: 'Sucker removal from tree bases' },
      { id: 'fertilizing-shrubs', name: 'Fertilizing shrubs/ornamentals' }
    ],
    complexityTiers: [
      { id: 'light-trim', name: 'Light trim', description: 'quick shaping, minor cleanup' },
      { id: 'full-prune', name: 'Full prune', description: 'full shaping, height/width reduction' },
      { id: 'cut-back', name: 'Cut-back/renovation', description: 'taking shrubs way down, severe overgrowth, heavy cleanup' }
    ]
  },
  {
    id: 'seasonal-cleanups',
    name: 'Seasonal Cleanups',
    services: [
      { id: 'spring-cleanup', name: 'Spring cleanup (general lawn & bed cleanup after winter)' },
      { id: 'fall-cleanup', name: 'Fall cleanup (leaves, pine needles, branches)' },
      { id: 'leaf-removal', name: 'Leaf removal (lawn + beds)' },
      { id: 'gutter-cleaning', name: 'Gutter cleaning (if you want to include it)' },
      { id: 'cutting-back-perennials', name: 'Cutting back perennials / ornamental grasses' },
      { id: 'removal-winter-protection', name: 'Removal of winter protection (burlap, stakes, etc.)' },
      { id: 'storm-debris', name: 'Storm debris cleanup (branches, fallen limbs, scattered trash)' },
      { id: 'hauling-disposal', name: 'Hauling and disposal of yard waste (off-site dump)' }
    ],
    complexityTiers: [
      { id: 'light', name: 'Light', description: 'minor leaves/debris, 1–2 barrels/bags' },
      { id: 'standard', name: 'Standard', description: 'normal seasonal cleanup, several bags' },
      { id: 'heavy', name: 'Heavy', description: 'tons of leaves, thick layers in beds, storm damage' }
    ]
  },
  {
    id: 'hardscape-property-care',
    name: 'Hardscape / Property Care',
    services: [
      { id: 'blowing-sweeping', name: 'Blowing / sweeping driveways, patios, walkways' },
      { id: 'weed-control-hardscape', name: 'Weed control in hardscape joints (pavers, gravel, cracks)' },
      { id: 'power-washing', name: 'Power washing patios / walkways (if you want it)' },
      { id: 'gravel-raking', name: 'Gravel / stone driveway raking or light grading' },
      { id: 're-leveling-pavers', name: 'Re-leveling small pavers or stepping stones' },
      { id: 'trash-pickup', name: 'Trash pickup from property (cups, bottles, etc.)' },
      { id: 'fence-line-clearing', name: 'Fence line clearing (brush/weed removal along fences)' },
      { id: 'perimeter-clearing', name: 'Perimeter clearing along property lines' }
    ],
    complexityTiers: [
      { id: 'spot', name: 'Spot', description: 'small area / quick touch-up' },
      { id: 'full-perimeter', name: 'Full perimeter', description: 'around full property, full driveway, etc.' },
      { id: 'heavy-reclaim', name: 'Heavy reclaim', description: 'clearing areas that haven\'t been touched in a long time' }
    ]
  },
  {
    id: 'irrigation',
    name: 'Irrigation',
    services: [
      { id: 'turn-on', name: 'Turn system on (spring)' },
      { id: 'turn-off', name: 'Turn system off / blow out (fall)' },
      { id: 'controller-adjustment', name: 'Controller adjustment (time/zone tweaks)' },
      { id: 'sprinkler-adjustments', name: 'Sprinkler head adjustments / minor repairs' },
      { id: 'leak-checks', name: 'Leak checks / simple fixes' }
    ],
    complexityTiers: [
      { id: 'basic', name: 'Basic', description: 'quick check, minor tweaks' },
      { id: 'standard', name: 'Standard', description: 'multiple zones adjusted, a few heads adjusted' },
      { id: 'repair', name: 'Repair', description: 'troubleshooting, replacing heads/lines' }
    ]
  },
  {
    id: 'snow-ice',
    name: 'Snow & Ice',
    services: [
      { id: 'driveway-plowing', name: 'Driveway plowing' },
      { id: 'parking-lot-plowing', name: 'Parking lot plowing' },
      { id: 'walkway-shoveling', name: 'Walkway shoveling' },
      { id: 'steps-shoveling', name: 'Steps / porch shoveling' },
      { id: 'snow-blowing', name: 'Snow blowing' },
      { id: 'salting-walkways', name: 'Salting / sanding walkways' },
      { id: 'salting-driveways', name: 'Salting / sanding driveways/parking' },
      { id: 'ice-scraping', name: 'Ice scraping / chip & clear' },
      { id: 'snow-relocation', name: 'Snow relocation (moving big piles on site)' }
    ],
    complexityTiers: [
      { id: 'light-event', name: 'Light event', description: 'dusting / small accumulation' },
      { id: 'standard-event', name: 'Standard event', description: 'typical storm in your area' },
      { id: 'heavy-event', name: 'Heavy event', description: 'deep snow, multiple passes' }
    ]
  }
]

// Universal complexity tiers for any service
export const UNIVERSAL_COMPLEXITY_TIERS = [
  { id: 'tier1', name: 'Tier 1 – Small / Simple' },
  { id: 'tier2', name: 'Tier 2 – Medium / Standard' },
  { id: 'tier3', name: 'Tier 3 – Large / Heavy / Overgrown' }
]

// Helper function to get category by ID
export const getCategoryById = (categoryId) => {
  return SERVICE_CATEGORIES.find(cat => cat.id === categoryId)
}

// Helper function to get service by ID within a category
export const getServiceById = (categoryId, serviceId) => {
  const category = getCategoryById(categoryId)
  if (!category) return null
  return category.services.find(service => service.id === serviceId)
}

