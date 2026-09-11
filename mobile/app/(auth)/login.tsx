/**
 * ============================================================================
 * APP/(AUTH)/LOGIN.TSX — MÀN HÌNH ĐĂNG NHẬP
 * ============================================================================
 *
 * BA THỨ MÀ FORM NÀO CŨNG PHẢI CÓ:
 *
 * 1. KIỂM TRA NGAY TẠI MÁY trước khi gửi lên server
 *    Email thiếu chữ "@" thì chặn luôn, khỏi tốn một vòng đi-về mạng.
 *    Nhưng CHÚ Ý: kiểm tra ở máy chỉ để TIỆN cho người dùng, KHÔNG phải
 *    để bảo mật. Server VẪN phải kiểm tra lại (và ta đã làm ở Bước 3).
 *
 * 2. TRÁNH BÀN PHÍM CHE Ô NHẬP
 *    KeyboardAvoidingView tự đẩy nội dung lên khi bàn phím hiện ra.
 *
 * 3. KHOÁ NÚT KHI ĐANG GỬI
 *    Không có bước này, người dùng bấm 3 lần = 3 request đăng nhập.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const t = useTheme();
  const router = useRouter();

  // Lấy TỪNG phần của store, không lấy cả object -> ít render lại hơn
  const login = useAuthStore((s) => s.login);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const serverError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  /** Kiểm tra dữ liệu tại máy. Trả về true nếu hợp lệ. */
  const validate = () => {
    const next: typeof errors = {};

    if (!email.trim()) {
      next.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      // Biểu thức đơn giản: "có ký tự @ và có dấu chấm sau đó".
      // Cố viết regex email "chuẩn RFC" là sai lầm — nó dài cả trang
      // và vẫn chặn nhầm email hợp lệ. Server mới là nơi kiểm tra thật.
      next.email = 'Email không đúng định dạng';
    }

    if (!password) {
      next.password = 'Vui lòng nhập mật khẩu';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;

    const ok = await login(email.trim(), password);

    // Thành công -> thay thế màn hình hiện tại bằng tab chính.
    // Dùng replace chứ KHÔNG dùng push: người dùng bấm nút Back
    // không nên quay lại được màn hình đăng nhập.
    if (ok) router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // iOS đẩy toàn bộ khung lên; Android chỉ cần thu nhỏ chiều cao
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: t.spacing.xl,
            gap: t.spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ================= PHẦN ĐẦU ================= */}
          <View style={{ alignItems: 'center', gap: t.spacing.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: t.radius.full,
                backgroundColor: t.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="football" size={38} color="#FFFFFF" />
            </View>

            <View style={{ alignItems: 'center', gap: 2 }}>
              <AppText variant="h2" center>
                Bóng Đá Việt Nam
              </AppText>
              <AppText variant="caption" tone="muted" center>
                Đăng nhập để theo dõi đội tuyển quốc gia
              </AppText>
            </View>
          </View>

          {/* ================= FORM ================= */}
          <View style={{ gap: t.spacing.lg }}>
            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Xoá lỗi ngay khi người dùng bắt đầu sửa -> không "mắng"
                // họ trong lúc đang gõ
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              placeholder="vd: nguyenvana@gmail.com"
              error={errors.email}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              // Bàn phím hiện nút "Tiếp" thay vì "Xong"
              returnKeyType="next"
              textContentType="emailAddress"
            />

            <Input
              label="Mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              placeholder="Nhập mật khẩu"
              error={errors.password}
              icon="lock-closed-outline"
              isPassword
              returnKeyType="go"
              // Gõ xong bấm Enter là đăng nhập luôn
              onSubmitEditing={() => void handleLogin()}
              textContentType="password"
            />

            {/* ---------- Lỗi từ server ---------- */}
            {serverError && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: t.spacing.sm,
                  backgroundColor: t.colors.loseSoft,
                  borderRadius: t.radius.md,
                  padding: t.spacing.md,
                  alignItems: 'flex-start',
                }}
              >
                <Ionicons name="alert-circle" size={17} color={t.colors.lose} />
                <AppText variant="caption" tone="lose" style={{ flex: 1 }}>
                  {serverError}
                </AppText>
              </View>
            )}

            <Button
              label="Đăng nhập"
              onPress={() => void handleLogin()}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          {/* ================= CHUYỂN SANG ĐĂNG KÝ ================= */}
          <View style={{ alignItems: 'center', gap: t.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="caption" tone="muted">
                Chưa có tài khoản?
              </AppText>
              <AppText
                variant="caption"
                tone="accent"
                style={{ fontWeight: t.fontWeight.bold }}
                onPress={() => router.push('/(auth)/register')}
                suppressHighlighting
              >
                Đăng ký ngay
              </AppText>
            </View>

            {/*
              LỐI VÀO CHO KHÁCH — quyết định sản phẩm quan trọng:
              hầu hết nội dung của app (tỷ số, đội hình, BXH) đều công khai.
              Bắt đăng nhập mới cho xem là cách nhanh nhất để mất người dùng.
              Đăng nhập chỉ cần cho tính năng cá nhân hoá (thông báo bàn thắng).
            */}
            <Button
              label="Xem không cần đăng nhập"
              onPress={() => router.replace('/(tabs)')}
              variant="ghost"
              haptic={false}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
