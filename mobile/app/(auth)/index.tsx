import { ActivityIndicator, Image, ImageBackground, Text, Touchable, TouchableOpacity, View } from "react-native";
import { useSocialAuth } from "../../hooks/useSocialAuth";

export default function Index() {
  const {handleSocialAuth, isLoading} = useSocialAuth();
  return (
  <ImageBackground
        source={require("../../assets/images/clique.png")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
    <View className="flex-1 px-8 justify-between">

        <View className="flex-1 justify-end pb-40">

          <View className="flex-col gap-2">

              <TouchableOpacity
                className="flex-row intems-center justify-center bg-white border border-gray-300 rounded-full py-3 px-6"
                onPress={() => handleSocialAuth("oauth_google")}
                disabled={isLoading}
                style={{
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 1,
                  },
                  shadowOpacity: 0.5,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
              {isLoading ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <View className="flex-row items-center justify-center">
                    <Image
                      source={require("../../assets/images/google.png")}
                      className="size-10 mr-3"
                      resizeMode="contain"
                    />
                    <Text className="text-black font-medium text-base">
                      Continue with Google
                    </Text>
                </View>
              )}
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row intems-center justify-center bg-white border border-gray-300 rounded-full py-3 px-6"
                onPress={() => handleSocialAuth("oauth_apple")}
                disabled={isLoading}
                style={{
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 1,
                  },
                  shadowOpacity: 0.5,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (

                <View className="flex-row items-center justify-center">
                  
                    <Image
                      source={require("../../assets/images/apple.png")}
                      className="size-10 mr-3"
                      resizeMode="contain"
                    />
                    <Text className="text-black font-medium text-base">
                      Continue with Apple
                    </Text>
                </View>
              )}
              </TouchableOpacity>
          </View>
          {/* Terms and Privacy */}
            <View className="mt-6 self-center max-w-[90%] rounded-xl bg-black/50 px-3 py-2">
              <Text className="text-center text-white text-xs leading-4">
                By signing up, you agree to our{" "}
                <Text className="underline">Terms</Text>,{" "}
                <Text className="underline">Privacy Policy</Text>, and{" "}
                <Text className="underline">Cookie Use</Text>.
              </Text>
            </View>


        </View>

    </View>

  </ImageBackground>
  );
}
