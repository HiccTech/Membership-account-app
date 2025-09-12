import {
  reactExtension,
  Card,
  Text,
  View,
  BlockStack,
  InlineStack,
  Heading,
  useApi,
  Spinner,
  Grid,
  SkeletonImage,
  Button,
  Modal,
  Pressable,
  Divider,
} from "@shopify/ui-extensions-react/customer-account";
import { useEffect, useState } from "react";

export default reactExtension("customer-account.page.render", () => (
  <MyPrivilegesModule />
));

// 统一域名常量，方便后续替换
const API_BASE = "https://mutt-trusting-kindly.ngrok-free.app";

// 特权类型
type Privilege = {
  id: string;
  title: string;
  isActive: boolean;
  shopifyDiscountCodeNodeId: string;
  usageLimit: number;
  asyncUsageCount: number;
  availableCount: number;
  codes: string[];
  startsAt?: string;
  endsAt?: string;
};

function MyPrivilegesModule(props: { refreshTrigger?: number }) {
  const { refreshTrigger } = props;
  const { sessionToken, query, navigation } = useApi();
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [privilegesLoading, setPrivilegesLoading] = useState<boolean>(false);
  const [privilegesError, setPrivilegesError] = useState<string | null>(null);
  

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPrivilegesLoading(true);
        setPrivilegesError(null);
        const token = await sessionToken.get();
        if (!token) throw new Error("Failed to obtain sessionToken");
        
        // 第一步：使用 Customer Account API 获取元字段数据
        const metafieldQuery = `query {
          customer {
            metafield(namespace: "custom", key: "discountcodejson") {
              value
            }
          }
        }`;

        const metafieldResult = await fetch("shopify://customer-account/api/unstable/graphql.json", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ query: metafieldQuery }),
        });

        const metafieldData = await metafieldResult.json();
        
        if (!metafieldResult.ok) {
          console.error("HTTP Error:", metafieldResult.status, metafieldResult.statusText);
          console.error("Response:", metafieldData);
          throw new Error(`HTTP ${metafieldResult.status}: ${metafieldResult.statusText}`);
        }
        
        if (metafieldData.errors) {
          console.error("GraphQL Errors:", metafieldData.errors);
          throw new Error(`GraphQL errors: ${metafieldData.errors.map((e: { message: string }) => e.message).join(', ')}`);
        }
        
        // 获取 custom.discountcodejson 元字段
        const customerData = metafieldData.data?.customer;
        const discountCodeMetafield = customerData?.metafield;

        const discountIds: string[] = [];
        
        if (discountCodeMetafield) {
          // 解析元字段的值（二维数组）
          const metafieldValue = discountCodeMetafield.value;
          const discountCodeJson = metafieldValue ? JSON.parse(metafieldValue) : null;
          
          if (Array.isArray(discountCodeJson)) {
            // 从二维数组中提取所有的 shopifyDiscountCodeNodeId
            discountCodeJson.forEach((row: unknown) => {
              if (Array.isArray(row)) {
                row.forEach((item: unknown) => {
                  if (item && typeof item === "object") {
                    const obj = item as Record<string, unknown>;
                    const nodeId = obj.shopifyDiscountCodeNodeId;
                    if (nodeId != null) {
                      const nodeIdStr = String(nodeId);
                      // 处理 gid://shopify/DiscountCodeNode/1777810178229 格式
                      // 提取最后的数字部分
                      const match = nodeIdStr.match(/\/(\d+)$/);
                      if (match) {
                        discountIds.push(match[1]);
                      } else {
                        // 如果格式不匹配，直接使用原值
                        discountIds.push(nodeIdStr);
                      }
                    }
                  }
                });
              }
            });
          }
        }
        
        // 如果元字段不存在或没有找到 ID，则显示空状态（场景1）
        if (discountIds.length === 0) {
          console.log("No discount IDs found in metafield, showing empty state");
          if (alive) {
            setPrivileges([]);
            setPrivilegesLoading(false);
          }
          return;
        }
        
        // 第二步：使用提取的 ID 请求折扣节点数据
        const queryString = discountIds.map(id => `id:${id}`).join(" OR ");
        const response = await fetch(`${API_BASE}/storefront/getCodeDiscountNodes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "1111",
          },
          body: JSON.stringify({
            query: queryString
          }),
        });

        const text = await response.text();
        let json: unknown = null;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error("The response is not valid JSON");
        }

        if (!response.ok) {
          const maybe = (json as { message?: unknown })?.message;
          const message =
            typeof maybe === "string" ? maybe : `HTTP ${response.status}`;
          throw new Error(message);
        }

        const code = (json as { code?: unknown })?.code;
        if (typeof code !== "number")
          throw new Error("Invalid response format");
        if (code !== 0) {
          const maybe = (json as { message?: unknown })?.message;
          const message = typeof maybe === "string" ? maybe : "Interface Error";
          throw new Error(message);
        }

        const data = (json as { data?: unknown })?.data as unknown;
        const codeDiscountNodes = (data as { codeDiscountNodes?: { nodes?: unknown[] } })?.codeDiscountNodes?.nodes || [];
        
        // 处理原始数据
        const rawPrivileges: Privilege[] = codeDiscountNodes.map((item, idx) => {
          const obj = (item ?? {}) as Record<string, unknown>;
          const codeDiscount = (obj.codeDiscount ?? {}) as Record<string, unknown>;
          
          const usageLimit = typeof codeDiscount.usageLimit === "number" ? codeDiscount.usageLimit : 0;
          const asyncUsageCount = typeof codeDiscount.asyncUsageCount === "number" ? codeDiscount.asyncUsageCount : 0;
          const availableCount = usageLimit - asyncUsageCount;
          
          // 根据新规则判断是否有效
          const isActive = codeDiscount.status === "ACTIVE" && availableCount >= 1;
          
           // 提取优惠码
           const codes = (codeDiscount.codes as { nodes?: Array<{ code?: unknown }> })?.nodes || [];
           const codeList = codes.map(c => String(c.code || "")).filter(c => c);
           
           // 提取日期信息
           const startsAt = typeof codeDiscount.startsAt === "string" ? codeDiscount.startsAt : undefined;
           const endsAt = typeof codeDiscount.endsAt === "string" ? codeDiscount.endsAt : undefined;
           
           return {
             id: obj.id != null ? String(obj.id) : String(idx),
             title: codeDiscount.title != null ? String(codeDiscount.title) : "Unknown Privilege",
             isActive: isActive,
             shopifyDiscountCodeNodeId: obj.id != null ? String(obj.id) : "",
             usageLimit,
             asyncUsageCount,
             availableCount,
             codes: codeList,
             startsAt,
             endsAt,
           };
        });

        // 按标题和有效性分组，分别合并有效和无效的相同标题优惠券
        const activeGroupedPrivileges = new Map<string, Privilege>();
        const inactiveGroupedPrivileges = new Map<string, Privilege>();
        
         rawPrivileges.forEach(privilege => {
           if (privilege.isActive) {
             // 处理有效的优惠券
             const existing = activeGroupedPrivileges.get(privilege.title);
             if (existing) {
               existing.usageLimit += privilege.usageLimit;
               existing.asyncUsageCount += privilege.asyncUsageCount;
               existing.availableCount += privilege.availableCount;
               existing.codes.push(...privilege.codes);
               // 保持最早的开始日期和最晚的结束日期
               if (privilege.startsAt && (!existing.startsAt || privilege.startsAt < existing.startsAt)) {
                 existing.startsAt = privilege.startsAt;
               }
               if (privilege.endsAt && (!existing.endsAt || privilege.endsAt > existing.endsAt)) {
                 existing.endsAt = privilege.endsAt;
               }
             } else {
               activeGroupedPrivileges.set(privilege.title, { ...privilege });
             }
           } else {
             // 处理无效的优惠券
             const existing = inactiveGroupedPrivileges.get(privilege.title);
             if (existing) {
               existing.usageLimit += privilege.usageLimit;
               existing.asyncUsageCount += privilege.asyncUsageCount;
               existing.availableCount += privilege.availableCount;
               existing.codes.push(...privilege.codes);
               // 保持最早的开始日期和最晚的结束日期
               if (privilege.startsAt && (!existing.startsAt || privilege.startsAt < existing.startsAt)) {
                 existing.startsAt = privilege.startsAt;
               }
               if (privilege.endsAt && (!existing.endsAt || privilege.endsAt > existing.endsAt)) {
                 existing.endsAt = privilege.endsAt;
               }
             } else {
               inactiveGroupedPrivileges.set(privilege.title, { ...privilege });
             }
           }
         });

        // 转换为数组
        const activePrivileges: Privilege[] = Array.from(activeGroupedPrivileges.values());
        const inactivePrivileges: Privilege[] = Array.from(inactiveGroupedPrivileges.values());

        // 合并有效和无效的特权，有效的前面
        const finalPrivileges = [...activePrivileges, ...inactivePrivileges];

        if (alive) setPrivileges(finalPrivileges);
      } catch (e) {
        if (alive) {
          let message = "Failed to load privileges";
          if (e instanceof Error) message = e.message;
          setPrivilegesError(message);
          setPrivileges([]);
        }
      } finally {
        if (alive) setPrivilegesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionToken, query, refreshTrigger]);

  return (
    <BlockStack spacing="extraLoose">
      <View />
      <BlockStack spacing="loose">
        <Grid columns={["fill", "auto"]} blockAlignment="center">
          <View>
            <Heading level={1}>
              <Text appearance="accent">My Privileges</Text>
            </Heading>
          </View>
          <View inlineAlignment="end">
            <View />
          </View>
        </Grid>
        
         {/* 内容区域 */}
         {privilegesLoading ? (
           <Card>
             <BlockStack padding="loose" inlineAlignment="center">
               <Spinner size="large" />
             </BlockStack>
           </Card>
         ) : privilegesError ? (
           <Card>
             <BlockStack padding="loose">
               <Text appearance="critical">{privilegesError}</Text>
             </BlockStack>
           </Card>
         ) : privileges.length > 0 ? (
           <Grid 
             columns={{
               default: ["1fr"],
               conditionals: [
                 {
                   conditions: { viewportInlineSize: { min: "small" } },
                   value: ["1fr", "1fr"]
                 }
               ]
             }}
             spacing="base"
           >
             {privileges.map((privilege) => {
               // 计算相同标题的数量
               const count = privilege.codes.length;
               const showCount = count > 1;
               
               // 格式化日期
               const formatDate = (dateString: string) => {
                 try {
                   const date = new Date(dateString);
                   const year = date.getFullYear();
                   const month = String(date.getMonth() + 1).padStart(2, '0');
                   const day = String(date.getDate()).padStart(2, '0');
                   return `${year}/${month}/${day}`;
                 } catch {
                   return dateString;
                 }
               };
               
               // 获取第一个优惠码
               const firstCode = privilege.codes[0] || "N/A";
               
               return (
                 <View key={privilege.id} opacity={privilege.isActive ? undefined : 50}>
                   <Card>
                     <BlockStack padding="base" spacing="tight">
                       {/* 第一行：骨架图和标题 */}
                       <InlineStack spacing="base" blockAlignment="center">
                         <SkeletonImage inlineSize={60} blockSize={60} />
                         <Text 
                           emphasis="bold" 
                           appearance={privilege.isActive ? "accent" : "subdued"}
                         >
                           {privilege.title}
                           {showCount && (
                             <Text
                               emphasis="italic"
                               appearance="subdued"
                             >
                               {" "}(×{count})
                             </Text>
                           )}
                         </Text>
                       </InlineStack>

                       <Divider />
                       
                       {/* 第二行：信息块和按钮块 */}
                       {privilege.title.includes("Birthday") || privilege.title.includes("Sign") ? (
                         /* 不显示按钮块，信息块占据100%宽度 */
                         <View>
                           <BlockStack spacing="extraTight">
                             {/* 静态内容占位 */}
                             <Text size="small" appearance="subdued">
                               Pick up at the exhibition hall
                             </Text>
                             
                             {/* CODE */}
                             <Text size="small" appearance="subdued">
                               CODE : {firstCode}
                             </Text>
                             
                             {/* 日期范围 */}
                             <Text size="small" appearance="subdued">
                               {formatDate(privilege.startsAt || "")} - {formatDate(privilege.endsAt || "")}
                             </Text>
                           </BlockStack>
                         </View>
                       ) : (
                         /* 显示按钮块，使用3:1比例布局 */
                         <Grid columns={["3fr", "1fr"]} spacing="base">
                           {/* 左侧信息块 - 占据3/4宽度 */}
                           <View>
                             <BlockStack spacing="extraTight">
                               {/* 静态内容占位 */}
                               <Text size="small" appearance="subdued">
                                 Pick up at the exhibition hall
                               </Text>
                               
                               {/* CODE */}
                               <Text size="small" appearance="subdued">
                                 CODE : {firstCode}
                               </Text>
                               
                               {/* 日期范围 */}
                               <Text size="small" appearance="subdued">
                                 {formatDate(privilege.startsAt || "")} - {formatDate(privilege.endsAt || "")}
                               </Text>
                             </BlockStack>
                           </View>
                           
                           {/* 右侧按钮块 - 占据1/4宽度 */}
                           <View inlineAlignment="center" blockAlignment="center">
                             <Button
                               kind="secondary"
                               disabled={!privilege.isActive}
                               overlay={
                                  <Modal
                                    id={`book-modal-${privilege.id}`}
                                    title='Contact Us'
                                    padding
                                  >
                                     <View padding="base" />
                                     <Grid 
                                       columns={{
                                         default: ["1fr"],
                                         conditionals: [
                                           {
                                             conditions: { viewportInlineSize: { min: "small" } },
                                             value: ["1fr", "1fr"]
                                           }
                                         ]
                                       }}
                                       spacing="base"
                                     >
                                      {/* Email 联系选项 */}
                                      <Pressable
                                        onPress={() => {
                                          navigation.navigate("https://www.baidu.com");
                                        }}
                                      >
                                        <Card padding>
                                          <BlockStack spacing="base" inlineAlignment="center">
                                            <InlineStack spacing="base" blockAlignment="center">
                                              <SkeletonImage inlineSize={40} blockSize={40} />
                                              <Text emphasis="bold">Email</Text>
                                            </InlineStack>
                                            <Text size="small" appearance="subdued">
                                              我们最迟在一个工作日回复
                                            </Text>
                                          </BlockStack>
                                        </Card>
                                      </Pressable>
                                      
                                      {/* WhatsApp 联系选项 */}
                                      <Pressable
                                        onPress={() => {
                                          navigation.navigate("https://www.google.com");
                                        }}
                                      >
                                        <Card padding>
                                          <BlockStack spacing="base" inlineAlignment="center">
                                            <InlineStack spacing="base" blockAlignment="center">
                                              <SkeletonImage inlineSize={40} blockSize={40} />
                                              <Text emphasis="bold" appearance="accent">WhatsApp</Text>
                                            </InlineStack>
                                            <Text size="small" appearance="subdued">
                                              我们最迟在一个工作日回复
                                            </Text>
                                          </BlockStack>
                                        </Card>
                                      </Pressable>
                                    </Grid>
                                    <View padding="base" />
                                  </Modal>
                               }
                             >
                               Book
                             </Button>
                           </View>
                         </Grid>
                       )}
                     </BlockStack>
                   </Card>
                 </View>
               );
             })}
           </Grid>
         ) : (
           /* 场景1：用户没有特权数据 - 显示加入Club的提示 */
           <Card>
             <BlockStack padding="loose" inlineAlignment="center" spacing="base">
               <Text>
                 Join our Club for free and enjoy multiple benefits
               </Text>
               <Button
                 kind="primary"
                 onPress={() => {
                   navigation.navigate("https://shopify.com/96773669045/account/pages/a89d9d2a-d014-45fa-8dbb-1043f92aade3");
                 }}
               >
                 Join Club
               </Button>
             </BlockStack>
           </Card>
         )}
      </BlockStack>
    </BlockStack>
  );
}

