import { Alert } from "react-native";

type ToastPayload = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export const useToast = () => {
  const toast = ({ title, description }: ToastPayload) => {
    Alert.alert(title, description);
  };

  return { toast };
};
