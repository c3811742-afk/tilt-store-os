// ISO 3166 country codes the owner can pick from. Names come from the browser in the active language
// (Intl.DisplayNames), so no country name is written by hand.
export const countryCodes = (
  'AE AR AT AU BE BH BR CA CH CN CY DE DK DZ EG ES FI FR GB GR HK ID IE IN IQ IT JO JP KE KR KW LB LY MA MX MY NG NL NO NZ OM PK PL PS PT QA RU SA SD SE SG SY TN TR TW UA US YE ZA'
).split(' ');

// Every currency the browser knows (ISO 4217): any currency can be used for a branch.
export const currencyCodes = (() => {
  try {
    return Intl.supportedValuesOf('currency');
  } catch {
    // Older browsers: the currencies the store uses today.
    return ['EGP', 'SAR', 'AED', 'USD', 'EUR'];
  }
})();
