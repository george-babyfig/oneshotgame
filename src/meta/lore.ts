// Lifebook field notes: every creature has a little story that unlocks after
// you've seen it a few times; seeing it often earns a gold "studied" frame.
import type { Profile } from './profile';

export const LORE_AT = 5;
export const STUDIED_AT = 15;

export const LORE: Record<string, string> = {
  bunny: 'Hopper Bunnies count clouds for fun. Nobody has ever seen one finish.',
  deer: 'Moss grows on a Moss Deer’s antlers so slowly that old ones wear whole gardens.',
  parrot: 'A Rainbow Parrot learns one new colour for every forest it visits.',
  fish: 'Glimfish glow brighter when they are happy, which is almost always.',
  reeffish: 'Reef Darters race each other around coral, but always call it a tie.',
  seal: 'Floe Seals nap on ice so thin it sings when they roll over.',
  crab: 'Steam Crabs warm their claws in hot springs before a long sideways walk.',
  goat: 'A Crag Goat can climb a cliff in the time it takes you to say “careful”.',
  llama: 'Cloud Llamas grow wool so fluffy that small clouds mistake them for family.',
  scorpion: 'Dune Scorpions draw maps in the sand. The wind erases them every night.',
  giraffe: 'Tall Necks can see tomorrow’s weather coming over the horizon.',
  penguin: 'Tuxlings slide everywhere. Walking is only for very formal occasions.',
  owl: 'Pine Owls know the name of every star, but only whisper them.',
  frog: 'A Bog Frog’s croak means “welcome home” in every swamp in the galaxy.',
  duck: 'Reed Ducks line their nests with the softest cattail fluff.',
  newt: 'Ember Newts nap in warm lava rock and wake up toasty and cheerful.',
  otter: 'Tide Otters hold paws while they sleep so the waves can’t drift them apart.',
  turtle: 'An Obsidian Turtle’s shell is made of cooled lava, polished by centuries of rain.',
  octopus: 'Canopy Octopuses live in treetops near the sea and juggle raindrops.',
  whale: 'Snow Whales sing so deep that icebergs hum along.',
  camel: 'An Oasis Camel can smell water three dunes away.',
  eagle: 'Frost Eagles ride the cold wind so high their feathers collect snowflakes.',
  bear: 'Ridge Bears are gentle giants who hum lullabies to sleepy mountains.',
  butterfly: 'Dew Butterflies drink one drop of morning dew and flutter all day.',
  elephant: 'Grass Elephants never forget a friend, or a good patch of clover.',
  wolf: 'Aurora Wolves howl at night, and the northern lights dance in reply.',
  flamingo: 'Steam Flamingos stand on one leg in hot springs to keep the other one cosy.',
  croc: 'Mud Crocs look grumpy but are secretly the best listeners in the marsh.',
  dragon: 'Sky Dragons are born inside storm clouds and hatch with the first thunder.',
  unicorn: 'A Prism Unicorn splits sunlight into rainbows wherever it trots.',
  sunbird: 'Sunbirds carry a spark of the sun in their feathers to warm lonely places.',
  kraken: 'The Kraken is shy. It only waves one tentacle, and only to friends.',
  mammoth: 'Woolly Mammoths remember the last ice age and tell stories about it.',
  dino: 'The Magma Rex roars to keep volcanoes awake. They are very sleepy mountains.',
  worldtree: 'The World Tree Spirit appears when a planet is truly alive. Its roots hold the whole world together.',
  leviathan: 'The Leviathan sleeps at the bottom of the deepest ocean, dreaming new seas.',
};

export function sightings(p: Profile, id: string) {
  return p.sightings?.[id] ?? 0;
}

export function sight(p: Profile, id: string) {
  p.sightings = { ...p.sightings, [id]: sightings(p, id) + 1 };
}

export const loreUnlocked = (p: Profile, id: string) => sightings(p, id) >= LORE_AT;
export const studied = (p: Profile, id: string) => sightings(p, id) >= STUDIED_AT;
