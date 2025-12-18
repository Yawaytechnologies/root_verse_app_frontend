// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import React from "react";
// import { Text, View } from "react-native";
// import { GlassCard } from "./MCShell";

// export default function MCFarmCard({
//   farm,
// }: {
//   farm: {
//     marineFarmId: string;
//     farmCode: string;
//     groupName: string;
//     leaderName: string;
//     mobile: string;
//     villageOrLanding: string;
//     gpsPolygons: string;
//     species: string;
//   };
// }) {
//   return (
//     <GlassCard radius={26} pad={20}>
//       {/* HEADER RIBBON */}
//       <LinearGradient
//         colors={[
//           "rgba(37,99,235,0.55)",
//           "rgba(59,130,246,0.45)",
//           "rgba(56,189,248,0.35)",
//         ]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={{
//           borderRadius: 22,
//           paddingHorizontal: 18,
//           paddingVertical: 14,
//         }}
//       >
//         <View className="flex-row items-center justify-between">
//           {/* Left */}
//           <View className="flex-1 pr-4">
//             <View className="flex-row items-center">
//               <View
//                 style={{
//                   height: 34,
//                   width: 34,
//                   borderRadius: 999,
//                   alignItems: "center",
//                   justifyContent: "center",
//                   backgroundColor: "rgba(15,23,42,0.65)",
//                   borderWidth: 1,
//                   borderColor: "rgba(148,163,184,0.7)",
//                 }}
//               >
//                 <Ionicons
//                   name="shield-checkmark-outline"
//                   size={18}
//                   color="#ffffff"
//                 />
//               </View>

//               <View style={{ marginLeft: 10 }}>
//                 <Text
//                   className="text-[11px]"
//                   style={{
//                     color: "rgba(255,255,255,0.8)",
//                     fontWeight: "800",
//                     letterSpacing: 1.1,
//                   }}
//                 >
//                   VERIFIED REGISTRY
//                 </Text>
//                 <Text
//                   className="text-[18px]"
//                   style={{
//                     color: "#ffffff",
//                     fontWeight: "900",
//                     letterSpacing: 0.4,
//                   }}
//                 >
//                   Marine Farm
//                 </Text>
//               </View>
//             </View>

//             <View style={{ marginTop: 10 }}>
//               <Text
//                 className="text-[11px]"
//                 style={{ color: "rgba(255,255,255,0.78)", lineHeight: 16 }}
//               >
//                 Immutable IDs • audit friendly • field‑ready
//               </Text>
//             </View>
//           </View>

//           {/* Farm code pill */}
//           <View
//             style={{
//               paddingHorizontal: 14,
//               paddingVertical: 7,
//               borderRadius: 999,
//               backgroundColor: "rgba(15,23,42,0.75)",
//               borderWidth: 1,
//               borderColor: "rgba(148,163,184,0.7)",
//             }}
//           >
//             <Text
//               className="text-[11px]"
//               style={{
//                 color: "#ffffff",
//                 fontWeight: "800",
//                 letterSpacing: 0.6,
//               }}
//               numberOfLines={1}
//             >
//               FARM • {farm.farmCode}
//             </Text>
//           </View>
//         </View>
//       </LinearGradient>

//       {/* MAIN CONTENT */}
//       <View className="mt-4 rounded-3xl bg-white/4 border border-white/12 p-5">
//         {/* ID + location */}
//         <View className="flex-row items-center justify-between">
//           <View className="flex-1 pr-4">
//             <Text
//               className="text-[11px]"
//               style={{ color: "rgba(255,255,255,0.7)" }}
//             >
//               Marine Farm ID
//             </Text>
//             <Text
//               className="text-[20px] mt-1"
//               style={{
//                 color: "#ffffff",
//                 fontWeight: "900",
//                 letterSpacing: 0.6,
//               }}
//               numberOfLines={1}
//             >
//               {farm.marineFarmId}
//             </Text>
//           </View>

//           <View
//             style={{
//               borderRadius: 999,
//               backgroundColor: "rgba(15,23,42,0.95)",
//               borderWidth: 1,
//               borderColor: "rgba(148,163,184,0.6)",
//               paddingHorizontal: 14,
//               paddingVertical: 7,
//             }}
//           >
//             <View className="flex-row items-center">
//               <Ionicons
//                 name="location-outline"
//                 size={14}
//                 color="rgba(255,255,255,0.8)"
//               />
//               <Text
//                 className="text-[11px] ml-2"
//                 style={{ color: "rgba(255,255,255,0.88)" }}
//                 numberOfLines={1}
//               >
//                 {farm.villageOrLanding}
//               </Text>
//             </View>
//           </View>
//         </View>

//         {/* PREMIUM FIELD GRID */}
//         <View className="mt-4 rounded-2xl bg-white/3 border border-white/12 p-3">
//           {/* top row: Group + Leader */}
//           <View className="flex-row gap-3">
//             <FancyField label="Group (SHG)" value={farm.groupName} />
//             <FancyField label="Leader" value={farm.leaderName} />
//           </View>

//           {/* middle row: Mobile + Species */}
//           <View className="flex-row gap-3 mt-3">
//             <FancyField label="Mobile" value={farm.mobile} />
//             <FancyField label="Species" value={farm.species} />
//           </View>

//           {/* bottom row: Farm code + GPS (GPS wider) */}
//           <View className="flex-row gap-3 mt-3">
//             <FancyField label="Farm Code" value={farm.farmCode} />
//             <FancyField
//               label="GPS Polygons"
//               value={farm.gpsPolygons}
//               wide
//             />
//           </View>
//         </View>
//       </View>

//       {/* STATUS ROW */}
//       <View className="mt-4 flex-row items-center justify-between">
//         <View className="flex-row">
//           <Pill icon="checkmark-circle" label="Verified" />
//           <View style={{ width: 8 }} />
//           <Pill icon="cloud-upload-outline" label="Synced" />
//         </View>

//         <Text
//           className="text-[10px]"
//           style={{ color: "rgba(255,255,255,0.6)" }}
//         >
//           Last update • 2 min ago
//         </Text>
//       </View>
//     </GlassCard>
//   );
// }

// function FancyField({
//   label,
//   value,
//   wide,
// }: {
//   label: string;
//   value: string;
//   wide?: boolean;
// }) {
//   return (
//     <View
//       style={{
//         flex: wide ? 1.4 : 1,
//         paddingHorizontal: 10,
//         paddingVertical: 8,
//         borderRadius: 14,
//         backgroundColor: "rgba(15,23,42,0.78)",
//         borderWidth: 1,
//         borderColor: "rgba(148,163,184,0.55)",
//       }}
//     >
//       <Text
//         className="text-[10px]"
//         style={{ color: "rgba(255,255,255,0.65)", letterSpacing: 0.4 }}
//         numberOfLines={1}
//       >
//         {label}
//       </Text>
//       <Text
//         className="text-[13px] mt-1"
//         style={{ color: "#ffffff", fontWeight: "700" }}
//         numberOfLines={1}
//         ellipsizeMode="tail"
//       >
//         {value || "—"}
//       </Text>
//     </View>
//   );
// }

// function Pill({ icon, label }: { icon: string; label: string }) {
//   return (
//     <View
//       style={{
//         flexDirection: "row",
//         alignItems: "center",
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 999,
//         backgroundColor: "rgba(15,23,42,0.95)",
//         borderWidth: 1,
//         borderColor: "rgba(148,163,184,0.7)",
//       }}
//     >
//       <Ionicons name={icon as any} size={13} color="#ffffff" />
//       <Text
//         className="text-[11px] ml-2"
//         style={{ color: "#ffffff", fontWeight: "600" }}
//       >
//         {label}
//       </Text>
//     </View>
//   );
// }
