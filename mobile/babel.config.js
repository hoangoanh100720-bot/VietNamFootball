/**
 * ============================================================================
 * BABEL.CONFIG.JS — CẤU HÌNH BIÊN DỊCH JAVASCRIPT
 * ============================================================================
 *
 * Babel dịch code hiện đại (TypeScript, JSX, cú pháp mới) thành JavaScript mà
 * máy ảo trên điện thoại hiểu được.
 *
 * babel-preset-expo đã bao gồm mọi thứ cần cho React Native + Expo Router.
 *
 * react-native-worklets/plugin BẮT BUỘC phải nằm CUỐI danh sách plugins.
 * Nó phục vụ Reanimated — thư viện chạy hoạt ảnh trên luồng riêng (UI thread)
 * để animation vẫn mượt 60fps ngay cả khi luồng JS đang bận tải dữ liệu.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
