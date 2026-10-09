export const projectLegal = Object.freeze({
  companyName: 'ООО «ЯрКиберСезон»',
  address: ['150040, Ярославская область, г. Ярославль,', 'ул. Володарского, д. 64, кв. 37'],
  identifiers: 'ИНН 7606143578 · ОГРН 1257600007500',
  copyright: '© 2026 ЯрКиберСезон',
  privacyUrl: 'https://ycs.bar/docs/' + encodeURIComponent('Политика_в_отношении_обработки_персональных_данных.pdf'),
});

export const projectContent = Object.freeze({
  brandName: "ЯрКиберСезон",
  logoUrl: "/assets/ycs-logo.jpg",
  contactEmail: "info@ycs.bar",
  partners: Object.freeze([
    Object.freeze({
      name: "Федерация компьютерного спорта Ярославской области",
      shortName: "ФКС ЯО",
      logoUrl: "/assets/partners/fks-yao.png",
    }),
    Object.freeze({
      name: "Министерство спорта Ярославской области",
      shortName: "Минспорта ЯО",
      logoUrl: "/assets/partners/minsport-yao.png",
    }),
    Object.freeze({
      name: "Додо Пицца",
      shortName: "Додо Пицца",
      logoUrl: "/assets/partners/dodo-pizza.jpg",
    }),
  ]),
});
