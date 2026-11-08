// Phone numbers are typed with spaces, dashes or a +; matching and checks use the digits only.
export const phoneDigits = (phone: string) => phone.replace(/[^0-9]/g, '');
