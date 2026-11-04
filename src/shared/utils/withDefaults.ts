// Merges a component's props over its defaults. Props passed as `undefined` keep the default.
export const withDefaults = <D extends object, P extends object>(defaults: D, props: P): D & P => {
  const definedProps = Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));
  return { ...defaults, ...definedProps } as D & P;
};
