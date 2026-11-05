export interface ThumbnailProps {
  src?: string; // no image: shows the name's first letter
  name?: string; // the alt text and the fallback letter
  size?: string;
  round?: boolean; // people are round, products and logos square
}
