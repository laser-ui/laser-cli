export default `@use '~styles/variables';
@use '~styles/mixins';

@include mixins.b(route-template) {
  position: relative;
  padding: 20px;
}
`;
