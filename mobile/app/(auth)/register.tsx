/**
 * ============================================================================
 * APP/(AUTH)/REGISTER.TSX — MÀN HÌNH ĐĂNG KÝ
 * ============================================================================
 *
 * ⭐ ĐIỂM ĐÁNG HỌC NHẤT Ở MÀN HÌNH NÀY: THANH ĐO ĐỘ MẠNH MẬT KHẨU
 *
 * Backend yêu cầu mật khẩu ≥8 ký tự, có chữ hoa, chữ thường, chữ số
 * (xem auth.validator.ts ở Bước 3).
 *
 * CÁCH LÀM DỞ: để người dùng gõ xong, bấm Đăng ký, rồi server trả về
 *              "mật khẩu phải có chữ hoa". Gõ lại. Lại thiếu chữ số. Gõ lại...
 *
 * CÁCH LÀM TỐT: hiện DANH SÁCH YÊU CẦU ngay dưới ô, tự tích xanh từng dòng
 *              khi người dùng gõ. Họ biết còn thiếu gì NGAY LẬP TỨC.
 *
 * Nguyên tắc chung: đừng bao giờ để người dùng đoán xem hệ thống muốn gì.
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
import { Button, IconButton } from '@/components/common/Button';
import { useAuthStore } from '@/store/authStore';

/** Danh sách yêu cầu mật khẩu — PHẢI khớp với auth.validator.ts của backend */
const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'Ít nhất 8 ký tự' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Có chữ thường (a-z)' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Có chữ hoa (A-Z)' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Có chữ số (0-9)' },
];

export default function RegisterScreen() {
  const t = useTheme();
  const router = useRouter();

  const register = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const serverError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  /** Chỉ hiện danh sách yêu cầu khi người dùng đã bắt đầu gõ mật khẩu */
  const showRules = password.length > 0;
  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));

  const validate = () => {
    const next: Record<string, string | undefined> = {};

    if (fullName.trim().length < 2) next.fullName = 'Họ tên phải có ít nhất 2 ký tự';

    if (!email.trim()) next.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Email không đúng định dạng';

    if (!allRulesPassed) next.password = 'Mật khẩu chưa đáp ứng đủ yêu cầu bên dưới';

    if (confirm !== password) next.confirm = 'Mật khẩu nhập lại không khớp';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;

    const ok = await register(email.trim(), password, fullName.trim());
    if (ok) router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Nút quay lại — luôn phải có lối thoát khỏi form */}
        <View style={{ paddingHorizontal: t.spacing.md, paddingTop: t.spacing.sm }}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            accessibilityLabel="Quay lại màn hình đăng nhập"
          />
        </View>

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
          <View style={{ gap: 2 }}>
            <AppText variant="h2">Tạo tài khoản</AppText>
            <AppText variant="caption" tone="muted">
              Nhận thông báo bàn thắng và theo dõi đội tuyển
            </AppText>
          </View>

          <View style={{ gap: t.spacing.lg }}>
            <Input
              label="Họ và tên"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined }));
              }}
              placeholder="vd: Nguyễn Văn A"
              error={errors.fullName}
              icon="person-outline"
              autoCapitalize="words"
              textContentType="name"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              placeholder="vd: nguyenvana@gmail.com"
              error={errors.email}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            <View style={{ gap: t.spacing.sm }}>
              <Input
                label="Mật khẩu"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                placeholder="Tạo mật khẩu mạnh"
                error={errors.password}
                icon="lock-closed-outline"
                isPassword
                textContentType="newPassword"
              />

              {/* ============ DANH SÁCH YÊU CẦU MẬT KHẨU ============ */}
              {showRules && (
                <View
                  style={{
                    backgroundColor: t.colors.surfaceSunken,
                    borderRadius: t.radius.md,
                    padding: t.spacing.md,
                    gap: 6,
                  }}
                >
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(password);

                    return (
                      <View
                        key={rule.label}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
                      >
                        {/*
                          Đạt: dấu tích ĐẶC màu xanh.
                          Chưa đạt: vòng tròn RỖNG màu xám.
                          Đổi CẢ hình dạng lẫn màu -> không phụ thuộc màu sắc.
                        */}
                        <Ionicons
                          name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={15}
                          color={passed ? t.colors.win : t.colors.textFaint}
                        />
                        <AppText variant="caption" tone={passed ? 'win' : 'faint'}>
                          {rule.label}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <Input
              label="Nhập lại mật khẩu"
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
              }}
              placeholder="Gõ lại mật khẩu ở trên"
              error={errors.confirm}
              icon="lock-closed-outline"
              isPassword
              onSubmitEditing={() => void handleRegister()}
              returnKeyType="go"
            />

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
              label="Đăng ký"
              onPress={() => void handleRegister()}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <AppText variant="caption" tone="muted">
              Đã có tài khoản?
            </AppText>
            <AppText
              variant="caption"
              tone="accent"
              style={{ fontWeight: t.fontWeight.bold }}
              onPress={() => router.back()}
              suppressHighlighting
            >
              Đăng nhập
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
