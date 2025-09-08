import {
  reactExtension,
  Card,
  Text,
  View,
  BlockStack,
  Heading,
  HeadingGroup,
  Button,
  Divider,
  Grid,
  Link,
  BlockSpacer,
  Modal,
  Form,
  TextField,
  InlineStack,
  useApi,
  DropZone,
  Select,
  DateField,
  ChoiceList,
  Choice,
  SkeletonImage,
  SkeletonText,
  Avatar,
  Icon,
  Image,
  Pressable,
  Spinner,
  useNavigation,
} from "@shopify/ui-extensions-react/customer-account";
import { useEffect, useState } from "react";

export default reactExtension("customer-account.page.render", () => (
  <AccountPage />
));

// 统一域名常量，方便后续替换
const API_BASE = "https://mutt-trusting-kindly.ngrok-free.app";

// 基础宠物类型（根据后端返回进行宽松映射）
type Pet = {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  birthday: string | null;
  avatarUrl: string | null;
  phone?: string | null;
  ins?: string | null;
  weight?: string | null;
  gender?: string | null;
  additionalInformation?: string | null;
};

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
};

function AccountPage() {
  const { sessionToken } = useApi();
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState<boolean>(false);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [privilegesRefreshTrigger, setPrivilegesRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPetsLoading(true);
        setPetsError(null);
        const token = await sessionToken.get();
        if (!token) throw new Error("Failed to obtain sessionToken");
        const resp = await fetch(
          `${API_BASE}/storefront/getPetsByShopifyCustomerID`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "ngrok-skip-browser-warning": "1111",
            },
          },
        );
        const text = await resp.text();
        let json: unknown = null;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error("The response is not valid JSON");
        }
        if (!resp.ok) {
          const maybe = (json as { message?: unknown })?.message;
          const message =
            typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
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
        const list: unknown[] = Array.isArray(data) ? (data as unknown[]) : [];
        const mapped: Pet[] = list.map((p, idx) => {
          const obj = (p ?? {}) as Record<string, unknown>;
          const rawName =
            (obj as { petName?: unknown; name?: unknown }).petName ?? obj.name;
          const rawType =
            (obj as { petType?: unknown; type?: unknown }).petType ?? obj.type;
          const rawAvatar =
            (obj as { petAvatarUrl?: unknown; avatarUrl?: unknown })
              .petAvatarUrl ?? obj.avatarUrl;
          return {
            id: obj.id != null ? String(obj.id) : String(idx),
            name: rawName != null ? String(rawName) : "Pet Name",
            type: rawType != null ? String(rawType) : "Unknown",
            breed: obj.breed != null ? String(obj.breed) : null,
            birthday: obj.birthday != null ? String(obj.birthday) : null,
            avatarUrl: rawAvatar != null ? String(rawAvatar) : null,
            phone:
              (obj as { phone?: unknown }).phone != null
                ? String((obj as { phone?: unknown }).phone as unknown)
                : null,
            ins:
              (obj as { petIns?: unknown }).petIns != null
                ? String((obj as { petIns?: unknown }).petIns as unknown)
                : null,
            weight:
              (obj as { weight?: unknown }).weight != null
                ? String((obj as { weight?: unknown }).weight as unknown)
                : null,
            gender:
              (obj as { gender?: unknown }).gender != null
                ? String((obj as { gender?: unknown }).gender as unknown)
                : null,
            additionalInformation:
              (obj as { additionalInformation?: unknown })
                .additionalInformation != null
                ? String(
                    (obj as { additionalInformation?: unknown })
                      .additionalInformation as unknown,
                  )
                : null,
          };
        });
        if (alive) setPets(mapped);
      } catch (e) {
        if (alive) {
          let message = "Failed to load";
          if (e instanceof Error) message = e.message;
          setPetsError(message);
          setPets([]);
        }
      } finally {
        if (alive) setPetsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionToken]);

  const handlePetCreated = (pet: Pet) => {
    setPets((prev) => {
      const next = Array.isArray(prev) ? prev.slice() : [];
      next.push(pet);
      return next;
    });
    // 宠物创建成功后，触发特权模块重新加载
    setPrivilegesRefreshTrigger(prev => prev + 1);
  };
  const handlePetDeleted = (id: string) => {
    setPets((prev) =>
      Array.isArray(prev) ? prev.filter((p) => p.id !== id) : [],
    );
  };
  const handlePetUpdated = (updated: Pet) => {
    setPets((prev) =>
      Array.isArray(prev)
        ? prev.map((p) => (p.id === updated.id ? updated : p))
        : [updated],
    );
  };

  return (
    <HeadingGroup>
      <MembershipModule />
      <MyPetsModule
        pets={pets}
        petsLoading={petsLoading}
        petsError={petsError}
        onPetCreated={handlePetCreated}
        onPetDeleted={handlePetDeleted}
        onPetUpdated={handlePetUpdated}
      />
      <MyPrivilegesModule refreshTrigger={privilegesRefreshTrigger} />
      <MembershipTiers
        hasPets={pets.length > 0}
        onPetCreated={handlePetCreated}
      />
    </HeadingGroup>
  );
}

function MembershipModule() {
  const { sessionToken } = useApi();
  const [storeCredit, setStoreCredit] = useState<number | null>(null);
  const [loadingCredit, setLoadingCredit] = useState<boolean>(true);
  const [creditError, setCreditError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        setLoadingCredit(true);
        setCreditError(null);

        const token = await sessionToken.get();
        if (!token) throw new Error("Failed to obtain sessionToken");

        const response = await fetch(
          `${API_BASE}/storefront/getStoreCreditBalance`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "ngrok-skip-browser-warning": "1111",
            },
          },
        );

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

        const dataField = (json as { data?: unknown })?.data as unknown;
        const nodes = (
          dataField as {
            customer?: {
              storeCreditAccounts?: {
                nodes?: Array<{
                  balance?: { amount?: unknown; currencyCode?: unknown };
                }>;
              };
            } | null;
          }
        )?.customer?.storeCreditAccounts?.nodes;

        let amount = 0;
        if (Array.isArray(nodes)) {
          const sgd = nodes.find(
            (n) => n && n.balance && n.balance.currencyCode === "SGD",
          );
          const raw = sgd?.balance?.amount;
          if (typeof raw === "number") amount = raw;
          else if (typeof raw === "string" && !Number.isNaN(Number(raw)))
            amount = Number(raw);
        }

        if (isActive) setStoreCredit(amount);
      } catch (err) {
        if (isActive) {
          let message = "Error";
          if (err instanceof Error) message = err.message;
          setCreditError(message);
          setStoreCredit(null);
        }
      } finally {
        if (isActive) setLoadingCredit(false);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [sessionToken]);

  return (
    <Card>
      <BlockStack spacing="loose">
        <View />
        <Grid
          columns={{
            default: ["1fr"],
            conditionals: [
              {
                conditions: { viewportInlineSize: { min: "medium" } },
                value: ["fill", "auto"],
              },
            ],
          }}
          blockAlignment="center"
          padding={{
            default: "base",
            conditionals: [
              {
                conditions: { viewportInlineSize: { min: "medium" } },
                value: "loose",
              },
            ],
          }}
        >
          <View
            inlineAlignment={{
              default: "center",
              conditionals: [
                {
                  conditions: { viewportInlineSize: { min: "medium" } },
                  value: "start",
                },
              ],
            }}
          >
            <View />
            <InlineStack spacing="base" blockAlignment="center">
              <Image
                source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/Union.png?v=1757488628"
              />
              <Text size="large" emphasis="bold" appearance="info">
                HICC PET Membership
              </Text>
            </InlineStack>
          </View>
          <View
            inlineAlignment={{
              default: "center",
              conditionals: [
                {
                  conditions: { viewportInlineSize: { min: "medium" } },
                  value: "end",
                },
              ],
            }}
          >
            <InlineStack spacing="base" blockAlignment="center">
              <Text emphasis="bold" size="base" appearance="info">
                Store Credit:
              </Text>
              {loadingCredit ? (
                <SkeletonText />
              ) : creditError ? (
                <Text emphasis="bold" size="large" appearance="subdued">
                  Error
                </Text>
              ) : (
                <Text emphasis="bold" size="extraLarge" appearance="accent">
                  {storeCredit !== null && storeCredit > 0
                    ? new Intl.NumberFormat("en-SG", {
                        style: "currency",
                        currency: "SGD",
                        currencyDisplay: "code",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(storeCredit)
                    : "0"}
                </Text>
              )}
            </InlineStack>
            <View />
          </View>
        </Grid>
        <View />
      </BlockStack>
    </Card>
  );
}

function MyPetsModule(props: {
  pets: Pet[];
  petsLoading: boolean;
  petsError: string | null;
  onPetCreated: (pet: Pet) => void;
  onPetDeleted: (id: string) => void;
  onPetUpdated: (pet: Pet) => void;
}) {
  const modalId = "create-pet-modal";
  const { sessionToken, ui } = useApi();
  const {
    pets,
    petsLoading,
    petsError,
    onPetCreated,
    onPetDeleted,
    onPetUpdated,
  } = props;
  const [phoneNumber, setPhoneNumber] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [breed, setBreed] = useState("");
  const [petIns, setPetIns] = useState("");
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);
  const [avatarError, setAvatarError] = useState<string | undefined>(undefined);
  const [birthday, setBirthday] = useState("" as string);
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [modalVariant, setModalVariant] = useState<"form" | "success">("form");
  const [petMedicalCondition, setPetMedicalCondition] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploadLoading, setAvatarUploadLoading] =
    useState<boolean>(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
    null,
  );
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [birthdayError, setBirthdayError] = useState<string | undefined>(
    undefined,
  );
  const [createdDraft, setCreatedDraft] = useState<Pet | null>(null);
  const [penHover, setPenHover] = useState(false);
  const [deleteHover, setDeleteHover] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editPetName, setEditPetName] = useState("");
  const [editPetType, setEditPetType] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editBirthday, setEditBirthday] = useState("" as string);
  const [editWeight, setEditWeight] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPetIns, setEditPetIns] = useState("");
  const [editPetMedicalCondition, setEditPetMedicalCondition] = useState("");
  const [editAvatarFiles, setEditAvatarFiles] = useState<File[]>([]);
  const [editAvatarError, setEditAvatarError] = useState<string | undefined>(
    undefined,
  );
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editAvatarLoading, setEditAvatarLoading] = useState<boolean>(false);
  const [editPhoneError, setEditPhoneError] = useState<string | undefined>(
    undefined,
  );
  const [editBirthdayError, setEditBirthdayError] = useState<
    string | undefined
  >(undefined);
  // 数据改由父组件传入
  const isEditValid =
    editPhoneNumber.trim().length > 0 &&
    editPetName.trim().length > 0 &&
    editPetType !== "" &&
    editBreed !== "" &&
    editBirthday.trim().length > 0 &&
    editWeight.trim().length > 0 &&
    editGender !== "" &&
    !editPhoneError &&
    !editBirthdayError;
  const isValid =
    phoneNumber.trim().length > 0 &&
    petName.trim().length > 0 &&
    petType !== "" &&
    breed !== "" &&
    birthday.trim().length > 0 &&
    weight.trim().length > 0 &&
    gender !== "" &&
    !phoneError &&
    !birthdayError;

  // 复用的"创建宠物档案"弹窗
  const createPetModal = (
    <Modal
      id={modalId}
      size="max"
      padding
      onOpen={() => setModalVariant("form")}
    >
      <BlockStack spacing="loose">
        {modalVariant === "form" ? (
          <>
            <View padding="none" inlineAlignment="center">
              <Text size="extraLarge" emphasis="bold" appearance="accent">
                Create an archive
              </Text>
            </View>
            <Form
              onSubmit={() => {
                if (!isValid) return;
                setModalVariant("success");
              }}
            >
              <BlockStack spacing="loose">
                <Text emphasis="bold" appearance="accent">
                  个人信息
                </Text>
                <TextField
                  label="* Phone Number"
                  value={phoneNumber}
                  error={phoneError}
                  onChange={(v) => {
                    setPhoneNumber(v);
                    setPhoneError(validatePhone(v));
                  }}
                />
                <Text emphasis="bold" appearance="accent">
                  宠物信息
                </Text>
                <View inlineAlignment="start">
                  {avatarUploadLoading ? (
                    <Spinner size="large" />
                  ) : avatarUrl ? (
                    <Avatar src={avatarUrl} size="extraLarge" alt="avatar" />
                  ) : null}
                </View>
                <View>
                  <DropZone
                    label="Avatar"
                    accept="image/*"
                    multiple={false}
                    error={avatarError}
                    onInput={(files) => {
                      setAvatarFiles(files);
                      setAvatarError(undefined);
                      if (files && files.length > 0) {
                        uploadAvatar(files[0]);
                      }
                    }}
                    onDropRejected={() => {
                      setAvatarFiles([]);
                      setAvatarError("仅支持图片类型");
                      setAvatarUploadError(null);
                    }}
                  />
                </View>
                {/* skeleton 已在预览位展示 */}
                {avatarUploadError && (
                  <Text appearance="critical">{avatarUploadError}</Text>
                )}
                {avatarFiles.length > 0 && (
                  <Text size="small" appearance="subdued">
                    已选择: {avatarFiles[0].name}
                  </Text>
                )}
                <TextField
                  label="* Pet name"
                  value={petName}
                  onChange={setPetName}
                />

                <Grid
                  columns={{
                    default: ["1fr"],
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: {
                            min: "small",
                          },
                        },
                        value: ["1fr", "1fr"],
                      },
                    ],
                  }}
                  spacing={{
                    default: "base",
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: {
                            min: "small",
                          },
                        },
                        value: "loose",
                      },
                    ],
                  }}
                >
                  <Select
                    label="* Pet Type"
                    value={petType}
                    onChange={setPetType}
                    options={[
                      { value: "", label: "Please select" },
                      { value: "Cat", label: "Cat" },
                      { value: "Dog", label: "Dog" },
                    ]}
                  />
                  <Select
                    label="* Breed"
                    value={breed}
                    onChange={setBreed}
                    options={[
                      { value: "", label: "Please select" },
                      { value: "Poodle", label: "Poodle" },
                      { value: "Test", label: "Test" },
                    ]}
                  />
                </Grid>

                <TextField
                  label="宠物ins"
                  value={petIns}
                  onChange={setPetIns}
                />

                <Grid
                  columns={{
                    default: ["1fr"],
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: { min: "small" },
                        },
                        value: ["1fr", "1fr"],
                      },
                    ],
                  }}
                  spacing={{
                    default: "base",
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: { min: "small" },
                        },
                        value: "loose",
                      },
                    ],
                  }}
                >
                  <DateField
                    label="* Birthday (estimate if you're not sure)"
                    value={birthday}
                    error={birthdayError}
                    onChange={(v) => {
                      setBirthday(v);
                      setBirthdayError(validateBirthday(v));
                    }}
                  />
                  <TextField
                    label="* Weight"
                    value={weight}
                    onChange={setWeight}
                  />
                </Grid>

                <BlockStack spacing="tight">
                  <Text>* Gender</Text>
                  <ChoiceList
                    name="gender"
                    value={gender}
                    onChange={(value) => {
                      setGender(Array.isArray(value) ? value[0] : value);
                    }}
                  >
                    <InlineStack spacing="loose">
                      <Choice id="male">Male</Choice>
                      <Choice id="female">Female</Choice>
                    </InlineStack>
                  </ChoiceList>
                </BlockStack>

                <TextField
                  label="My pet has medical condition"
                  value={petMedicalCondition}
                  onChange={setPetMedicalCondition}
                />

                {createError && (
                  <Text appearance="critical">{createError}</Text>
                )}
                <InlineStack inlineAlignment="end" spacing="base">
                  <Button
                    kind="primary"
                    disabled={!isValid || createLoading}
                    onPress={async () => {
                      if (!isValid || createLoading) return;
                      await handleCreate();
                    }}
                  >
                    Submit
                  </Button>
                </InlineStack>
              </BlockStack>
            </Form>
            <View />
          </>
        ) : (
          <>
            <View padding="none" inlineAlignment="center">
              <Text size="extraLarge" emphasis="bold" appearance="accent">
                CONGRATULATIONS ON BECOMING A MEMBER
              </Text>
            </View>
            <View />

            <View background="subdued" borderRadius="base" padding="loose">
              {/* 顶部横幅 */}
              <View padding="base" background="subdued" borderRadius="base">
                <BlockStack inlineAlignment="center">
                  <Text size="large" emphasis="bold" appearance="accent">
                    The Following Benefits Are All Used For Offline
                  </Text>
                </BlockStack>
              </View>

              <BlockSpacer spacing="loose" />

              {/* 权益 2x2 宫格 */}
              <Grid
                columns={{
                  default: ["1fr"],
                  conditionals: [
                    {
                      conditions: { viewportInlineSize: { min: "small" } },
                      value: ["1fr", "1fr"],
                    },
                  ],
                }}
                spacing="loose"
              >
                {/* Free Gifts */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/1-Free-Gifts.png?v=1757494229" />
                    <Text emphasis="bold">Free Gifts</Text>
                    <Text size="small" appearance="subdued">
                      Values $12.9
                    </Text>
                  </BlockStack>
                </Card>

                {/* Party */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/2-Party.png?v=1757494229" />
                    <Text emphasis="bold">Party</Text>
                    <Text size="small" appearance="subdued">
                      Sneak Peek
                    </Text>
                  </BlockStack>
                </Card>

                {/* showroom */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/3-Showroom.png?v=1757494229" />
                    <Text emphasis="bold">showroom</Text>
                    <Text size="small" appearance="subdued">
                      Free 1h Value $199
                    </Text>
                  </BlockStack>
                </Card>

                {/* 1v1Class */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/4-1v1Class.png?v=1757494229" />
                    <Text emphasis="bold">1v1Class</Text>
                    <Text size="small" appearance="subdued">
                      Value $100
                    </Text>
                  </BlockStack>
                </Card>
              </Grid>
              <BlockStack inlineAlignment="center">
                <BlockSpacer spacing="loose" />
                <Button
                  kind="primary"
                  onPress={() => {
                    if (createdDraft) {
                      onPetCreated(createdDraft);
                      setCreatedDraft(null);
                    }
                    ui.overlay.close(modalId);
                  }}
                >
                  Use Now
                </Button>
              </BlockStack>
            </View>

            <BlockStack inlineAlignment="center">
              <Text size="small" appearance="subdued">
                Congratulations on becoming a member
              </Text>
            </BlockStack>
          </>
        )}
      </BlockStack>
    </Modal>
  );

  function validatePhone(value: string): string | undefined {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15)
      return "Please enter a valid phone number";
    return undefined;
  }

  function validateBirthday(value: string): string | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
      return "Please select a valid date";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "Please select a valid date";
    const now = new Date();
    if (d.getTime() > now.getTime()) return "Birthday cannot be in the future";
    return undefined;
  }

  async function uploadAvatar(file: File) {
    try {
      setAvatarUploadLoading(true);
      setAvatarUploadError(null);
      const token = await sessionToken.get();
      if (!token) throw new Error("Failed to obtain sessionToken");
      const form = new FormData();
      form.append("image", file);
      const resp = await fetch(`${API_BASE}/storefront/uploadPetAvatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "1111",
        },
        body: form,
      });
      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("The response is not valid JSON");
      }
      if (!resp.ok) {
        const maybe = (json as { message?: unknown })?.message;
        const message =
          typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
        throw new Error(message);
      }
      const code = (json as { code?: unknown })?.code;
      if (typeof code !== "number") throw new Error("Invalid response format");
      if (code !== 0) {
        const maybe = (json as { message?: unknown })?.message;
        const message = typeof maybe === "string" ? maybe : "Interface Error";
        throw new Error(message);
      }
      const data = (json as { data?: unknown })?.data as unknown;
      let raw: string | null = null;
      if (typeof data === "string") {
        raw = data;
      } else if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const maybeUrl = (obj as { url?: unknown }).url;
        if (typeof maybeUrl === "string") raw = maybeUrl;
      }
      if (!raw) throw new Error("Upload succeeded but no URL returned");
      const full = /^https?:/i.test(raw)
        ? raw
        : `${API_BASE}/static/${String(raw).replace(/^\/+/, "")}`;
      setAvatarUrl(full);
    } catch (e) {
      let message = "Upload failed";
      if (e instanceof Error) message = e.message;
      setAvatarUploadError(message);
      setAvatarUrl(null);
    } finally {
      setAvatarUploadLoading(false);
    }
  }

  async function handleCreate() {
    try {
      setCreateLoading(true);
      setCreateError(null);
      const token = await sessionToken.get();
      if (!token) throw new Error("Failed to obtain sessionToken");
      const body = {
        phone: phoneNumber,
        petAvatarUrl: avatarUrl ?? "",
        petName,
        petType,
        breed,
        petIns,
        birthday,
        weight,
        gender,
        additionalInformation: petMedicalCondition,
      };
      const resp = await fetch(`${API_BASE}/storefront/addPet`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "1111",
        },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("The response is not valid JSON");
      }
      if (!resp.ok) {
        const maybe = (json as { message?: unknown })?.message;
        const message =
          typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
        throw new Error(message);
      }
      const code = (json as { code?: unknown })?.code;
      if (typeof code !== "number") throw new Error("Invalid response format");
      if (code !== 0) {
        const maybe = (json as { message?: unknown })?.message;
        const message = typeof maybe === "string" ? maybe : "Interface Error";
        throw new Error(message);
      }
      const dataUnknown = (json as { data?: unknown })?.data as unknown;
      const obj =
        dataUnknown && typeof dataUnknown === "object"
          ? (dataUnknown as Record<string, unknown>)
          : {};
      const created: Pet = {
        id: obj["id"] != null ? String(obj["id"]) : `${Date.now()}`,
        name: petName,
        type: petType,
        breed: breed || null,
        birthday: birthday || null,
        avatarUrl: avatarUrl || null,
        phone: phoneNumber,
        ins: petIns,
        weight: weight,
        gender: gender,
        additionalInformation: petMedicalCondition,
      };
      if (pets.length === 0) {
        setCreatedDraft(created);
        setModalVariant("success");
      } else {
        onPetCreated(created);
        ui.overlay.close(modalId);
      }
    } catch (e) {
      let message = "Create failed";
      if (e instanceof Error) message = e.message;
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteById(targetId: string) {
    try {
      setDeletingId(targetId);
      setDeleteError(null);
      const token = await sessionToken.get();
      if (!token) throw new Error("Failed to obtain sessionToken");
      const resp = await fetch(`${API_BASE}/storefront/deletePetById`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "1111",
        },
        body: JSON.stringify({ id: Number(targetId) }),
      });
      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("The response is not valid JSON");
      }
      if (!resp.ok) {
        const maybe = (json as { message?: unknown })?.message;
        const message =
          typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
        throw new Error(message);
      }
      const code = (json as { code?: unknown })?.code;
      if (typeof code !== "number") throw new Error("Invalid response format");
      if (code !== 0) {
        const maybe = (json as { message?: unknown })?.message;
        const message = typeof maybe === "string" ? maybe : "Interface Error";
        throw new Error(message);
      }
      onPetDeleted(targetId);
    } catch (e) {
      let message = "Delete failed";
      if (e instanceof Error) message = e.message;
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadEditAvatar(file: File) {
    try {
      setEditAvatarLoading(true);
      setEditError(null);
      const token = await sessionToken.get();
      if (!token) throw new Error("Failed to obtain sessionToken");
      const form = new FormData();
      form.append("image", file);
      const resp = await fetch(`${API_BASE}/storefront/uploadPetAvatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "1111",
        },
        body: form,
      });
      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("The response is not valid JSON");
      }
      if (!resp.ok) {
        const maybe = (json as { message?: unknown })?.message;
        const message =
          typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
        throw new Error(message);
      }
      const code = (json as { code?: unknown })?.code;
      if (typeof code !== "number") throw new Error("Invalid response format");
      if (code !== 0) {
        const maybe = (json as { message?: unknown })?.message;
        const message = typeof maybe === "string" ? maybe : "Interface Error";
        throw new Error(message);
      }
      const data = (json as { data?: unknown })?.data as unknown;
      let raw: string | null = null;
      if (typeof data === "string") raw = data;
      else if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const maybeUrl = (obj as { url?: unknown }).url;
        if (typeof maybeUrl === "string") raw = maybeUrl;
      }
      if (!raw) throw new Error("Upload succeeded but no URL returned");
      const full = /^https?:/i.test(raw)
        ? raw
        : `${API_BASE}/static/${String(raw).replace(/^\/+/, "")}`;
      setEditAvatarUrl(full);
    } catch (e) {
      let message = "Upload failed";
      if (e instanceof Error) message = e.message;
      setEditError(message);
    } finally {
      setEditAvatarLoading(false);
    }
  }

  async function handleEditSubmit(petId: string) {
    try {
      setEditSaving(true);
      setEditError(null);
      const token = await sessionToken.get();
      if (!token) throw new Error("Failed to obtain sessionToken");
      const body = {
        id: Number(petId),
        phone: editPhoneNumber,
        petAvatarUrl: editAvatarUrl ?? "",
        petName: editPetName,
        petType: editPetType,
        breed: editBreed,
        petIns: editPetIns,
        birthday: editBirthday,
        weight: editWeight,
        gender: editGender,
        additionalInformation: editPetMedicalCondition,
      };
      const resp = await fetch(`${API_BASE}/storefront/updatePetById`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "1111",
        },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("The response is not valid JSON");
      }
      if (!resp.ok) {
        const maybe = (json as { message?: unknown })?.message;
        const message =
          typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
        throw new Error(message);
      }
      const code = (json as { code?: unknown })?.code;
      if (typeof code !== "number") throw new Error("Invalid response format");
      if (code !== 0) {
        const maybe = (json as { message?: unknown })?.message;
        const message = typeof maybe === "string" ? maybe : "Interface Error";
        throw new Error(message);
      }
      const updated: Pet = {
        id: String(petId),
        name: editPetName,
        type: editPetType,
        breed: editBreed || null,
        birthday: editBirthday || null,
        avatarUrl: editAvatarUrl || null,
        phone: editPhoneNumber,
        ins: editPetIns,
        weight: editWeight,
        gender: editGender,
        additionalInformation: editPetMedicalCondition,
      };
      onPetUpdated(updated);
      ui.overlay.close("edit-pet-modal");
    } catch (e) {
      let message = "Update failed";
      if (e instanceof Error) message = e.message;
      setEditError(message);
    } finally {
      setEditSaving(false);
    }
  }

  // 获取逻辑由父组件负责
  return (
    <BlockStack spacing="extraLoose">
      <View />
      <BlockStack spacing="loose">
        <Grid columns={["fill", "auto"]} blockAlignment="center">
          <View>
            <Heading level={1}>
              <Text appearance="accent">My Pets</Text>
            </Heading>
          </View>
          <View inlineAlignment="end">
            {!petsLoading && !petsError && pets.length > 0 ? (
              <Button 
                kind="plain"
                overlay={
                  <Modal
                    id={modalId}
                    size="max"
                    padding
                    onOpen={() => setModalVariant("form")}
                  >
                    <BlockStack spacing="loose">
                      {modalVariant === "form" ? (
                        <>
                          <View padding="none" inlineAlignment="center">
                            <Text
                              size="extraLarge"
                              emphasis="bold"
                              appearance="accent"
                            >
                              Create an archive
                            </Text>
                          </View>
                          <Form
                            onSubmit={() => {
                              if (!isValid) return;
                            }}
                          >
                            <BlockStack spacing="loose">
                              <Text emphasis="bold" appearance="accent">
                                个人信息
                              </Text>
                              <TextField
                                label="* Phone Number"
                                value={phoneNumber}
                                onChange={setPhoneNumber}
                              />
                              <Text emphasis="bold" appearance="accent">
                                宠物信息
                              </Text>
                              <View inlineAlignment="start">
                                {avatarUploadLoading ? null : avatarUrl ? (
                                  <Avatar
                                    src={avatarUrl}
                                    size="extraLarge"
                                    alt="avatar"
                                  />
                                ) : null}
                              </View>
                              <View>
                                <DropZone
                                  label="Avatar"
                                  accept="image/*"
                                  multiple={false}
                                  error={avatarError}
                                  onInput={(files) => {
                                    setAvatarFiles(files);
                                    setAvatarError(undefined);
                                    if (files && files.length > 0) {
                                      uploadAvatar(files[0]);
                                    }
                                  }}
                                  onDropRejected={() => {
                                    setAvatarFiles([]);
                                    setAvatarError("仅支持图片类型");
                                    setAvatarUploadError(null);
                                  }}
                                />
                              </View>
                              {avatarUploadError && (
                                <Text appearance="critical">
                                  {avatarUploadError}
                                </Text>
                              )}
                              {avatarFiles.length > 0 && (
                                <Text size="small" appearance="subdued">
                                  已选择: {avatarFiles[0].name}
                                </Text>
                              )}
                              <TextField
                                label="* Pet name"
                                value={petName}
                                onChange={setPetName}
                              />
                              <Grid
                                columns={{
                                  default: ["1fr"],
                                  conditionals: [
                                    {
                                      conditions: {
                                        viewportInlineSize: { min: "small" },
                                      },
                                      value: ["1fr", "1fr"],
                                    },
                                  ],
                                }}
                                spacing={{
                                  default: "base",
                                  conditionals: [
                                    {
                                      conditions: {
                                        viewportInlineSize: { min: "small" },
                                      },
                                      value: "loose",
                                    },
                                  ],
                                }}
                              >
                                <Select
                                  label="* Pet Type"
                                  value={petType}
                                  onChange={setPetType}
                                  options={[
                                    { value: "", label: "Please select" },
                                    { value: "Cat", label: "Cat" },
                                    { value: "Dog", label: "Dog" },
                                  ]}
                                />
                                <Select
                                  label="* Breed"
                                  value={breed}
                                  onChange={setBreed}
                                  options={[
                                    { value: "", label: "Please select" },
                                    { value: "Poodle", label: "Poodle" },
                                    { value: "Test", label: "Test" },
                                  ]}
                                />
                              </Grid>
                              <TextField
                                label="宠物ins"
                                value={petIns}
                                onChange={setPetIns}
                              />
                              <Grid
                                columns={{
                                  default: ["1fr"],
                                  conditionals: [
                                    {
                                      conditions: {
                                        viewportInlineSize: { min: "small" },
                                      },
                                      value: ["1fr", "1fr"],
                                    },
                                  ],
                                }}
                                spacing={{
                                  default: "base",
                                  conditionals: [
                                    {
                                      conditions: {
                                        viewportInlineSize: { min: "small" },
                                      },
                                      value: "loose",
                                    },
                                  ],
                                }}
                              >
                                <DateField
                                  label="* Birthday (estimate if you're not sure)"
                                  value={birthday}
                                  onChange={setBirthday}
                                />
                                <TextField
                                  label="* Weight"
                                  value={weight}
                                  onChange={setWeight}
                                />
                              </Grid>
                              <BlockStack spacing="tight">
                                <Text>* Gender</Text>
                                <ChoiceList
                                  name="gender"
                                  value={gender}
                                  onChange={(value) => {
                                    setGender(
                                      Array.isArray(value) ? value[0] : value,
                                    );
                                  }}
                                >
                                  <InlineStack spacing="loose">
                                    <Choice id="male">Male</Choice>
                                    <Choice id="female">Female</Choice>
                                  </InlineStack>
                                </ChoiceList>
                              </BlockStack>
                              <TextField
                                label="My pet has medical condition"
                                value={petMedicalCondition}
                                onChange={setPetMedicalCondition}
                              />
                              {createError && (
                                <Text appearance="critical">{createError}</Text>
                              )}
                              <InlineStack inlineAlignment="end" spacing="base">
                                <Button
                                  kind="primary"
                                  disabled={!isValid || createLoading}
                                  onPress={async () => {
                                    if (!isValid || createLoading) return;
                                    await handleCreate();
                                  }}
                                >
                                  Submit
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </Form>
                          <View />
                        </>
                      ) : (
                        <>
                          <View padding="none" inlineAlignment="center">
                            <Text
                              size="extraLarge"
                              emphasis="bold"
                              appearance="accent"
                            >
                              CONGRATULATIONS ON BECOMING A MEMBER
                            </Text>
                          </View>
                          <View />
                        </>
                      )}
                    </BlockStack>
                  </Modal>
                }
              >
                + Add
              </Button>
            ) : (
              <View />
            )}
          </View>
        </Grid>

        {/* 创建宠物档案模块：仅当加载完成、无错误并且无宠物数据时显示 */}
        {!petsLoading && !petsError && pets.length === 0 && (
          <Card>
            <BlockStack spacing="loose" padding="loose">
              <View />
              <View padding="loose">
                <BlockStack spacing="loose" inlineAlignment="center">
                  <Text size="medium" appearance="info">
                    You haven&apos;t created the pet profile yet.
                  </Text>
                  <Text size="medium" appearance="info">
                    创建档案享受 lounge 权益
                  </Text>
                  <Button kind="primary" overlay={createPetModal}>
                    + Add a new Pets
                  </Button>
                </BlockStack>
              </View>
              <View />
            </BlockStack>
          </Card>
        )}

        {/* 宠物档案列表：有数据才显示 */}
        {petsLoading ? (
          <Card>
            <BlockStack padding="loose" inlineAlignment="center">
              <Spinner size="large" />
            </BlockStack>
          </Card>
        ) : petsError ? (
          <Card>
            <BlockStack padding="loose">
              <Text appearance="critical">{petsError}</Text>
            </BlockStack>
          </Card>
        ) : pets.length > 0 ? (
          pets.map((p) => (
            <Card key={p.id}>
              <Grid columns={["fill", "auto"]} padding="loose">
                {/* 第一列：头像+名字同行，下面是详细信息 */}
                <BlockStack spacing="tight">
                  <InlineStack spacing="base" blockAlignment="center">
                    {p.avatarUrl ? (
                      <Avatar src={p.avatarUrl} size="base" alt={p.name} />
                    ) : null}
                    <Text size="medium">{p.name}</Text>
                  </InlineStack>
                  <InlineStack spacing="tight">
                    <Text size="medium">Type:</Text>
                    <Text size="medium">{p.type}</Text>
                  </InlineStack>
                  <InlineStack spacing="tight">
                    <Text size="medium">Breed:</Text>
                    <Text size="medium">{p.breed ?? "Unknown"}</Text>
                  </InlineStack>
                  <InlineStack spacing="tight">
                    <Text size="medium">Birthday:</Text>
                    <Text size="medium">{p.birthday ?? "Unknown"}</Text>
                  </InlineStack>
                </BlockStack>

                {/* 第二列：图标一行展示，整体贴底（复用原编辑/删除交互） */}
                <Grid rows={["fill", "auto"]}>
                  <View />
                  <InlineStack spacing="base" inlineAlignment="end">
                    <Pressable
                      overlay={
                        <Modal id="edit-pet-modal" size="max" padding>
                          <BlockStack spacing="loose">
                            <View padding="none" inlineAlignment="center">
                              <Text
                                size="extraLarge"
                                emphasis="bold"
                                appearance="accent"
                              >
                                Edit an archive
                              </Text>
                            </View>
                            <Form
                              onSubmit={() => {
                                if (!isEditValid) return;
                              }}
                            >
                              <BlockStack spacing="loose">
                                <Text emphasis="bold" appearance="accent">
                                  个人信息
                                </Text>
                                <TextField
                                  label="* Phone Number"
                                  value={editPhoneNumber}
                                  error={editPhoneError}
                                  onChange={(v) => {
                                    setEditPhoneNumber(v);
                                    setEditPhoneError(validatePhone(v));
                                  }}
                                />
                                <Text emphasis="bold" appearance="accent">
                                  宠物信息
                                </Text>
                                <View inlineAlignment="start">
                                  {editAvatarLoading ? (
                                    <Spinner size="large" />
                                  ) : editAvatarUrl ? (
                                    <Avatar
                                      src={editAvatarUrl}
                                      size="extraLarge"
                                      alt="avatar"
                                    />
                                  ) : null}
                                </View>
                                <View>
                                  <DropZone
                                    label="Avatar"
                                    accept="image/*"
                                    multiple={false}
                                    error={editAvatarError}
                                    onInput={(files) => {
                                      setEditAvatarFiles(files);
                                      setEditAvatarError(undefined);
                                      if (files && files.length > 0)
                                        uploadEditAvatar(files[0]);
                                    }}
                                    onDropRejected={() => {
                                      setEditAvatarFiles([]);
                                      setEditAvatarError("仅支持图片类型");
                                    }}
                                  />
                                </View>
                                {editAvatarFiles.length > 0 && (
                                  <Text size="small" appearance="subdued">
                                    已选择: {editAvatarFiles[0].name}
                                  </Text>
                                )}
                                <TextField
                                  label="* Pet name"
                                  value={editPetName}
                                  onChange={setEditPetName}
                                />
                                <Grid
                                  columns={{
                                    default: ["1fr"],
                                    conditionals: [
                                      {
                                        conditions: {
                                          viewportInlineSize: { min: "small" },
                                        },
                                        value: ["1fr", "1fr"],
                                      },
                                    ],
                                  }}
                                  spacing={{
                                    default: "base",
                                    conditionals: [
                                      {
                                        conditions: {
                                          viewportInlineSize: { min: "small" },
                                        },
                                        value: "loose",
                                      },
                                    ],
                                  }}
                                >
                                  <Select
                                    label="* Pet Type"
                                    value={editPetType}
                                    onChange={setEditPetType}
                                    options={[
                                      { value: "", label: "Please select" },
                                      { value: "Cat", label: "Cat" },
                                      { value: "Dog", label: "Dog" },
                                    ]}
                                  />
                                  <Select
                                    label="* Breed"
                                    value={editBreed}
                                    onChange={setEditBreed}
                                    options={[
                                      { value: "", label: "Please select" },
                                      { value: "Poodle", label: "Poodle" },
                                      { value: "Test", label: "Test" },
                                    ]}
                                  />
                                </Grid>
                                <TextField
                                  label="宠物ins"
                                  value={editPetIns}
                                  onChange={setEditPetIns}
                                />
                                <Grid
                                  columns={{
                                    default: ["1fr"],
                                    conditionals: [
                                      {
                                        conditions: {
                                          viewportInlineSize: { min: "small" },
                                        },
                                        value: ["1fr", "1fr"],
                                      },
                                    ],
                                  }}
                                  spacing={{
                                    default: "base",
                                    conditionals: [
                                      {
                                        conditions: {
                                          viewportInlineSize: { min: "small" },
                                        },
                                        value: "loose",
                                      },
                                    ],
                                  }}
                                >
                                  <DateField
                                    label="* Birthday (estimate if you're not sure)"
                                    value={editBirthday}
                                    error={editBirthdayError}
                                    onChange={(v) => {
                                      setEditBirthday(v);
                                      setEditBirthdayError(validateBirthday(v));
                                    }}
                                  />
                                  <TextField
                                    label="* Weight"
                                    value={editWeight}
                                    onChange={setEditWeight}
                                  />
                                </Grid>
                                <BlockStack spacing="tight">
                                  <Text>* Gender</Text>
                                  <ChoiceList
                                    name="editGender"
                                    value={editGender}
                                    onChange={(value) => {
                                      setEditGender(
                                        Array.isArray(value) ? value[0] : value,
                                      );
                                    }}
                                  >
                                    <InlineStack spacing="loose">
                                      <Choice id="male">Male</Choice>
                                      <Choice id="female">Female</Choice>
                                    </InlineStack>
                                  </ChoiceList>
                                </BlockStack>
                                <TextField
                                  label="My pet has medical condition"
                                  value={editPetMedicalCondition}
                                  onChange={setEditPetMedicalCondition}
                                />
                                {editError && (
                                  <Text appearance="critical">{editError}</Text>
                                )}
                                <InlineStack
                                  inlineAlignment="end"
                                  spacing="base"
                                >
                                  <Button
                                    kind="primary"
                                    disabled={!isEditValid || editSaving}
                                    onPress={async () => {
                                      if (!isEditValid || editSaving) return;
                                      await handleEditSubmit(p.id);
                                    }}
                                  >
                                    Submit
                                  </Button>
                                </InlineStack>
                              </BlockStack>
                            </Form>
                          </BlockStack>
                        </Modal>
                      }
                      onPointerEnter={() => setPenHover(true)}
                      onPointerLeave={() => setPenHover(false)}
                      onPress={() => {
                        setEditPhoneNumber(p.phone ?? "");
                        setEditPetName(p.name ?? "");
                        setEditPetType(p.type ?? "");
                        setEditBreed(p.breed ?? "");
                        setEditBirthday(p.birthday ?? "");
                        setEditWeight(p.weight ?? "");
                        setEditGender(p.gender ?? "");
                        setEditPetIns(p.ins ?? "");
                        setEditPetMedicalCondition(
                          p.additionalInformation ?? "",
                        );
                        setEditAvatarUrl(p.avatarUrl ?? null);
                        setEditAvatarFiles([]);
                        setEditAvatarError(undefined);
                        setEditError(null);
                        setEditAvatarLoading(false);
                        setEditPhoneError(validatePhone(p.phone ?? ""));
                        setEditBirthdayError(
                          validateBirthday(p.birthday ?? ""),
                        );
                      }}
                    >
                      <Icon
                        source="pen"
                        appearance={penHover ? "accent" : "base"}
                      />
                    </Pressable>
                    {
                      /* 注释限制：开发阶段允许删除唯一一条 */ true && (
                        <Pressable
                          overlay={
                            <Modal id="confirm-delete" padding>
                              <BlockStack spacing="loose">
                                <Text appearance="info">
                                  Delete the existing files?
                                </Text>
                                {deleteError && (
                                  <Text appearance="critical">
                                    {deleteError}
                                  </Text>
                                )}
                                <InlineStack
                                  inlineAlignment="end"
                                  spacing="base"
                                >
                                  <Button
                                    kind="primary"
                                    onPress={() =>
                                      ui.overlay.close("confirm-delete")
                                    }
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    kind="secondary"
                                    disabled={deletingId === p.id}
                                    onPress={async () => {
                                      if (deletingId) return;
                                      await handleDeleteById(p.id);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </InlineStack>
                              </BlockStack>
                            </Modal>
                          }
                          onPointerEnter={() => setDeleteHover(true)}
                          onPointerLeave={() => setDeleteHover(false)}
                        >
                          <Icon
                            source="delete"
                            appearance={deleteHover ? "accent" : "base"}
                          />
                        </Pressable>
                      )
                    }
                  </InlineStack>
                </Grid>
              </Grid>
            </Card>
          ))
        ) : null}
      </BlockStack>
    </BlockStack>
  );
}

function MyPrivilegesModule(props: { refreshTrigger?: number }) {
  const { refreshTrigger } = props;
  const { sessionToken, query } = useApi();
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
        
        // 如果元字段不存在或没有找到 ID，则不显示该模块
        if (discountIds.length === 0) {
          console.log("No discount IDs found in metafield, hiding My Privileges module");
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
          
          return {
            id: obj.id != null ? String(obj.id) : String(idx),
            title: codeDiscount.title != null ? String(codeDiscount.title) : "Unknown Privilege",
            isActive: isActive,
            shopifyDiscountCodeNodeId: obj.id != null ? String(obj.id) : "",
            usageLimit,
            asyncUsageCount,
            availableCount,
            codes: codeList,
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

  // 如果没有数据且没有错误且不在加载中，则不显示该模块
  if (!privilegesLoading && !privilegesError && privileges.length === 0) {
    return null;
  }

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
        
        {/* 特权卡片网格 */}
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
          <Card>
            <BlockStack padding="loose">
              <Grid
                columns={{
                  default: ["1fr", "1fr"],
                  conditionals: [
                    {
                      conditions: { viewportInlineSize: { min: "medium" } },
                      value: ["1fr", "1fr", "1fr", "1fr"],
                    },
                  ],
                }}
                spacing="base"
              >
                {privileges.map((privilege) => {
                  // 计算相同标题的数量
                  const count = privilege.codes.length;
                  const showCount = count > 1;
                  
                  return (
                    <View key={privilege.id} opacity={privilege.isActive ? undefined : 50}>
                      <Card>
                        <BlockStack
                          padding="loose"
                          spacing="tight"
                          inlineAlignment="center"
                        >
                          <SkeletonImage inlineSize={60} blockSize={60} />
                          <Text 
                            emphasis="bold" 
                            appearance={privilege.isActive ? "accent" : "subdued"}
                          >
                            {privilege.title}{showCount ? ` ` : ""}
                            {showCount && (
                              <Text
                                emphasis="italic"
                                appearance="subdued"
                              >
                                (×{count})
                              </Text>
                            )}
                          </Text>
                        </BlockStack>
                      </Card>
                    </View>
                  );
                })}
              </Grid>
            </BlockStack>
          </Card>
        ) : null}
      </BlockStack>
    </BlockStack>
  );
}

function MembershipTiers(props: {
  hasPets: boolean;
  onPetCreated: (pet: Pet) => void;
}) {
  const { hasPets, onPetCreated } = props;
  const { sessionToken, ui } = useApi();
  const navigation = useNavigation();

  // Join Now 创建表单状态
  const [phoneNumber, setPhoneNumber] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [breed, setBreed] = useState("");
  const [petIns, setPetIns] = useState("");
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);
  const [avatarError, setAvatarError] = useState<string | undefined>(undefined);
  const [birthday, setBirthday] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [modalVariant, setModalVariant] = useState<"form" | "success">("form");
  const [petMedicalCondition, setPetMedicalCondition] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploadLoading, setAvatarUploadLoading] =
    useState<boolean>(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
    null,
  );
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [birthdayError, setBirthdayError] = useState<string | undefined>(
    undefined,
  );
  const [createdDraft, setCreatedDraft] = useState<Pet | null>(null);

  // 表单验证
  const isValid =
    phoneNumber.trim().length > 0 &&
    petName.trim().length > 0 &&
    petType !== "" &&
    breed !== "" &&
    birthday.trim().length > 0 &&
    weight.trim().length > 0 &&
    gender !== "" &&
    !phoneError &&
    !birthdayError;

  // 验证函数
  function validatePhone(value: string): string | undefined {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15)
      return "Please enter a valid phone number";
    return undefined;
  }

  function validateBirthday(value: string): string | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
      return "Please select a valid date";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "Please select a valid date";
    const now = new Date();
    if (d.getTime() > now.getTime()) return "Birthday cannot be in the future";
    return undefined;
  }

  // 头像上传函数
  async function uploadAvatar(file: File) {
    try {
      setAvatarUploadLoading(true);
      setAvatarUploadError(null);
      const token = await sessionToken.get();
      if (!token) throw new Error("Failed to obtain sessionToken");
      const form = new FormData();
      form.append("image", file);
      const resp = await fetch(`${API_BASE}/storefront/uploadPetAvatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "1111",
        },
        body: form,
      });
      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("The response is not valid JSON");
      }
      if (!resp.ok) {
        const maybe = (json as { message?: unknown })?.message;
        const message =
          typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
        throw new Error(message);
      }
      const code = (json as { code?: unknown })?.code;
      if (typeof code !== "number") throw new Error("Invalid response format");
      if (code !== 0) {
        const maybe = (json as { message?: unknown })?.message;
        const message = typeof maybe === "string" ? maybe : "Interface Error";
        throw new Error(message);
      }
      const data = (json as { data?: unknown })?.data as unknown;
      let raw: string | null = null;
      if (typeof data === "string") {
        raw = data;
      } else if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const maybeUrl = (obj as { url?: unknown }).url;
        if (typeof maybeUrl === "string") raw = maybeUrl;
      }
      if (!raw) throw new Error("Upload succeeded but no URL returned");
      const full = /^https?:/i.test(raw)
        ? raw
        : `${API_BASE}/static/${String(raw).replace(/^\/+/, "")}`;
      setAvatarUrl(full);
    } catch (e) {
      let message = "Upload failed";
      if (e instanceof Error) message = e.message;
      setAvatarUploadError(message);
      setAvatarUrl(null);
    } finally {
      setAvatarUploadLoading(false);
    }
  }

  // 创建宠物档案函数
  async function handleCreate() {
    try {
      setCreateLoading(true);
      setCreateError(null);
      const token = await sessionToken.get();
      if (!token) throw new Error("Failed to obtain sessionToken");
      const body = {
        phone: phoneNumber,
        petAvatarUrl: avatarUrl ?? "",
        petName,
        petType,
        breed,
        petIns,
        birthday,
        weight,
        gender,
        additionalInformation: petMedicalCondition,
      };
      const resp = await fetch(`${API_BASE}/storefront/addPet`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "1111",
        },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("The response is not valid JSON");
      }
      if (!resp.ok) {
        const maybe = (json as { message?: unknown })?.message;
        const message =
          typeof maybe === "string" ? maybe : `HTTP ${resp.status}`;
        throw new Error(message);
      }
      const code = (json as { code?: unknown })?.code;
      if (typeof code !== "number") throw new Error("Invalid response format");
      if (code !== 0) {
        const maybe = (json as { message?: unknown })?.message;
        const message = typeof maybe === "string" ? maybe : "Interface Error";
        throw new Error(message);
      }
      const dataUnknown = (json as { data?: unknown })?.data as unknown;
      const obj =
        dataUnknown && typeof dataUnknown === "object"
          ? (dataUnknown as Record<string, unknown>)
          : {};
      const created: Pet = {
        id: obj["id"] != null ? String(obj["id"]) : `${Date.now()}`,
        name: petName,
        type: petType,
        breed: breed || null,
        birthday: birthday || null,
        avatarUrl: avatarUrl || null,
        phone: phoneNumber,
        ins: petIns,
        weight: weight,
        gender: gender,
        additionalInformation: petMedicalCondition,
      };
      // 首次创建成功后显示成功页面
      setCreatedDraft(created);
      setModalVariant("success");
    } catch (e) {
      let message = "Create failed";
      if (e instanceof Error) message = e.message;
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  }

  // 创建宠物档案弹窗组件
  const createPetOverlay = (modalId: string) => (
    <Modal
      id={modalId}
      size="max"
      padding
      onOpen={() => setModalVariant("form")}
    >
      <BlockStack spacing="loose">
        {modalVariant === "form" ? (
          <>
            <View padding="none" inlineAlignment="center">
              <Text size="extraLarge" emphasis="bold" appearance="accent">
                Create an archive
              </Text>
            </View>
            <Form
              onSubmit={() => {
                if (!isValid) return;
                setModalVariant("success");
              }}
            >
              <BlockStack spacing="loose">
                <Text emphasis="bold" appearance="accent">
                  个人信息
                </Text>
                <TextField
                  label="* Phone Number"
                  value={phoneNumber}
                  error={phoneError}
                  onChange={(v) => {
                    setPhoneNumber(v);
                    setPhoneError(validatePhone(v));
                  }}
                />
                <Text emphasis="bold" appearance="accent">
                  宠物信息
                </Text>
                <View inlineAlignment="start">
                  {avatarUploadLoading ? (
                    <Spinner size="large" />
                  ) : avatarUrl ? (
                    <Avatar src={avatarUrl} size="extraLarge" alt="avatar" />
                  ) : null}
                </View>
                <View>
                  <DropZone
                    label="Avatar"
                    accept="image/*"
                    multiple={false}
                    error={avatarError}
                    onInput={(files) => {
                      setAvatarFiles(files);
                      setAvatarError(undefined);
                      if (files && files.length > 0) {
                        uploadAvatar(files[0]);
                      }
                    }}
                    onDropRejected={() => {
                      setAvatarFiles([]);
                      setAvatarError("仅支持图片类型");
                      setAvatarUploadError(null);
                    }}
                  />
                </View>
                {avatarUploadError && (
                  <Text appearance="critical">{avatarUploadError}</Text>
                )}
                {avatarFiles.length > 0 && (
                  <Text size="small" appearance="subdued">
                    已选择: {avatarFiles[0].name}
                  </Text>
                )}
                <TextField
                  label="* Pet name"
                  value={petName}
                  onChange={setPetName}
                />

                <Grid
                  columns={{
                    default: ["1fr"],
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: {
                            min: "small",
                          },
                        },
                        value: ["1fr", "1fr"],
                      },
                    ],
                  }}
                  spacing={{
                    default: "base",
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: {
                            min: "small",
                          },
                        },
                        value: "loose",
                      },
                    ],
                  }}
                >
                  <Select
                    label="* Pet Type"
                    value={petType}
                    onChange={setPetType}
                    options={[
                      { value: "", label: "Please select" },
                      { value: "Cat", label: "Cat" },
                      { value: "Dog", label: "Dog" },
                    ]}
                  />
                  <Select
                    label="* Breed"
                    value={breed}
                    onChange={setBreed}
                    options={[
                      { value: "", label: "Please select" },
                      { value: "Poodle", label: "Poodle" },
                      { value: "Test", label: "Test" },
                    ]}
                  />
                </Grid>

                <TextField
                  label="宠物ins"
                  value={petIns}
                  onChange={setPetIns}
                />

                <Grid
                  columns={{
                    default: ["1fr"],
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: { min: "small" },
                        },
                        value: ["1fr", "1fr"],
                      },
                    ],
                  }}
                  spacing={{
                    default: "base",
                    conditionals: [
                      {
                        conditions: {
                          viewportInlineSize: { min: "small" },
                        },
                        value: "loose",
                      },
                    ],
                  }}
                >
                  <DateField
                    label="* Birthday (estimate if you're not sure)"
                    value={birthday}
                    error={birthdayError}
                    onChange={(v) => {
                      setBirthday(v);
                      setBirthdayError(validateBirthday(v));
                    }}
                  />
                  <TextField
                    label="* Weight"
                    value={weight}
                    onChange={setWeight}
                  />
                </Grid>

                <BlockStack spacing="tight">
                  <Text>* Gender</Text>
                  <ChoiceList
                    name="gender"
                    value={gender}
                    onChange={(value) => {
                      setGender(Array.isArray(value) ? value[0] : value);
                    }}
                  >
                    <InlineStack spacing="loose">
                      <Choice id="male">Male</Choice>
                      <Choice id="female">Female</Choice>
                    </InlineStack>
                  </ChoiceList>
                </BlockStack>

                <TextField
                  label="My pet has medical condition"
                  value={petMedicalCondition}
                  onChange={setPetMedicalCondition}
                />

                {createError && (
                  <Text appearance="critical">{createError}</Text>
                )}
                <InlineStack inlineAlignment="end" spacing="base">
                  <Button
                    kind="primary"
                    disabled={!isValid || createLoading}
                    onPress={async () => {
                      if (!isValid || createLoading) return;
                      await handleCreate();
                    }}
                  >
                    Submit
                  </Button>
                </InlineStack>
              </BlockStack>
            </Form>
            <View />
          </>
        ) : (
          <>
            <View padding="none" inlineAlignment="center">
              <Text size="extraLarge" emphasis="bold" appearance="accent">
                CONGRATULATIONS ON BECOMING A MEMBER
              </Text>
            </View>
            <View />

            <View background="subdued" borderRadius="base" padding="loose">
              {/* 顶部横幅 */}
              <View padding="base" background="subdued" borderRadius="base">
                <BlockStack inlineAlignment="center">
                  <Text size="large" emphasis="bold" appearance="accent">
                    The Following Benefits Are All Used For Offline
                  </Text>
                </BlockStack>
              </View>

              <BlockSpacer spacing="loose" />

              {/* 权益 2x2 宫格 */}
              <Grid
                columns={{
                  default: ["1fr"],
                  conditionals: [
                    {
                      conditions: { viewportInlineSize: { min: "small" } },
                      value: ["1fr", "1fr"],
                    },
                  ],
                }}
                spacing="loose"
              >
                {/* Free Gifts */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/1-Free-Gifts.png?v=1757494229" />
                    <Text emphasis="bold">Free Gifts</Text>
                    <Text size="small" appearance="subdued">
                      Values $12.9
                    </Text>
                  </BlockStack>
                </Card>

                {/* Party */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/2-Party.png?v=1757494229" />
                    <Text emphasis="bold">Party</Text>
                    <Text size="small" appearance="subdued">
                      Sneak Peek
                    </Text>
                  </BlockStack>
                </Card>

                {/* showroom */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/3-Showroom.png?v=1757494229" />
                    <Text emphasis="bold">showroom</Text>
                    <Text size="small" appearance="subdued">
                      Free 1h Value $199
                    </Text>
                  </BlockStack>
                </Card>

                {/* 1v1Class */}
                <Card>
                  <BlockStack
                    padding="loose"
                    spacing="tight"
                    inlineAlignment="center"
                  >
                    <Image source="https://cdn.shopify.com/s/files/1/0967/7366/9045/files/4-1v1Class.png?v=1757494229" />
                    <Text emphasis="bold">1v1Class</Text>
                    <Text size="small" appearance="subdued">
                      Value $100
                    </Text>
                  </BlockStack>
                </Card>
              </Grid>
              <BlockStack inlineAlignment="center">
                <BlockSpacer spacing="loose" />
                <Button
                  kind="primary"
                  onPress={() => {
                    if (createdDraft) {
                      onPetCreated(createdDraft);
                      setCreatedDraft(null);
                    }
                    ui.overlay.close(modalId);
                  }}
                >
                  Use Now
                </Button>
              </BlockStack>
            </View>

            <BlockStack inlineAlignment="center">
              <Text size="small" appearance="subdued">
                Congratulations on becoming a member
              </Text>
            </BlockStack>
          </>
        )}
      </BlockStack>
    </Modal>
  );

  // 模拟用户当前会员状态 - 实际项目中会从API获取
  return (
    <BlockStack spacing="extraLoose">
      <View />
      <BlockStack spacing="loose">
        <HeadingGroup>
          <Heading level={1}>
            <Text appearance="accent">HICC Pet Club</Text>
          </Heading>
          <Card>
            <BlockStack spacing="loose" padding="loose">
              <View />
              <Grid
                columns={{
                  default: ["1fr"],
                  conditionals: [
                    {
                      conditions: { viewportInlineSize: { min: "small" } },
                      value: ["1fr", "1fr"],
                    },
                    {
                      conditions: { viewportInlineSize: { min: "medium" } },
                      value: ["1fr", "1fr", "1fr"],
                    },
                  ],
                }}
                spacing={{
                  default: "base",
                  conditionals: [
                    {
                      conditions: { viewportInlineSize: { min: "medium" } },
                      value: "loose",
                    },
                  ],
                }}
              >
                {/* Lounge */}
                <Grid border="base" borderRadius="base">
                  <Grid rows={["auto", "auto", "fill"]}>
                    <View padding="base">
                      <BlockStack spacing="loose" inlineAlignment="center">
                        <View padding="tight">
                          <Text
                            size="large"
                            emphasis="bold"
                            appearance="accent"
                          >
                            Lounge
                          </Text>
                        </View>
                      </BlockStack>
                    </View>
                    <Divider />
                    <Grid rows={"fill"} padding="base">
                      <Grid rows={["auto", "fill", "auto"]}>
                        <BlockStack>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Reward
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Welcome gift</Text>
                          </View>
                          <View padding="base">
                            <Text>Gift for Birthday</Text>
                          </View>
                          <View padding="base">
                            <Text>1v1 Personalized GroomingClass</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Grooming
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Free Aromatherapyor Grass Mud Spa</Text>
                          </View>
                          <View padding="base">
                            <Text>Free Massage</Text>
                          </View>
                          <BlockSpacer spacing="loose" />
                        </BlockStack>
                        <View />
                        <Button
                          kind="primary"
                          disabled={hasPets}
                          overlay={
                            !hasPets
                              ? createPetOverlay("join-now-lounge")
                              : undefined
                          }
                        >
                          {hasPets ? "您已享受该权益" : "Join Now"}
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Circle */}
                <Grid border="base" borderRadius="base">
                  <Grid rows={["auto", "auto", "fill"]}>
                    <View padding="base">
                      <Grid columns={["fill", "auto"]} rows={["auto"]}>
                        <BlockStack spacing="loose" inlineAlignment="center">
                          <View padding="tight">
                            <Text
                              size="large"
                              emphasis="bold"
                              appearance="accent"
                            >
                              Circle
                            </Text>
                          </View>
                        </BlockStack>
                        {/* 角标 - 右上角定位 */}
                        <View
                          padding="tight"
                          background="subdued"
                          border="base"
                          borderRadius="base"
                          display="none"
                        >
                          <Text
                            size="small"
                            emphasis="bold"
                            appearance="accent"
                          >
                            ×2
                          </Text>
                        </View>
                      </Grid>
                    </View>
                    <Divider />
                    <Grid rows={"fill"} padding="base">
                      <Grid rows={["auto", "fill", "auto"]}>
                        <BlockStack>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Reward
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Welcome gift</Text>
                          </View>
                          <View padding="base">
                            <Text>Gift for Birthday</Text>
                          </View>
                          <View padding="base">
                            <Text>1v1 Personalized GroomingClass</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Grooming
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Free Aromatherapyor Grass Mud Spa</Text>
                          </View>
                          <View padding="base">
                            <Text>Free Massage</Text>
                          </View>
                          <View padding="base">
                            <Text>10 sessions grooming</Text>
                          </View>
                          <BlockSpacer spacing="loose" />
                        </BlockStack>
                        <View />
                        <Button
                          kind="primary"
                          overlay={
                            !hasPets
                              ? createPetOverlay("join-now-circle")
                              : undefined
                          }
                          onPress={() => {
                            if (hasPets) {
                              navigation.navigate(
                                "https://test-store-hicc1.myshopify.com/cart/51712180519093:1?go=checkout",
                              );
                            }
                          }}
                        >
                          {hasPets ? "$1000 Save $429" : "Join Now"}
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Prive */}
                <Grid border="base" borderRadius="base">
                  <Grid rows={["auto", "auto", "fill"]}>
                    <View padding="base">
                      <BlockStack spacing="loose" inlineAlignment="center">
                        <View padding="tight">
                          <Text
                            size="large"
                            emphasis="bold"
                            appearance="accent"
                          >
                            Prive
                          </Text>
                        </View>
                      </BlockStack>
                    </View>
                    <Divider />
                    <Grid rows={"fill"} padding="base">
                      <Grid rows={["auto", "fill", "auto"]}>
                        <BlockStack>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Reward
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Welcome gift</Text>
                          </View>
                          <View padding="base">
                            <Text>Gift for Birthday</Text>
                          </View>
                          <View padding="base">
                            <Text>1v1 Personalized GroomingClass</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Grooming
                            </Text>
                          </View>
                          <View padding="base">
                            <Text>Free Aromatherapyor Grass Mud Spa</Text>
                          </View>
                          <View padding="base">
                            <Text>Free Message</Text>
                          </View>
                          <View padding="base">
                            <Text>20 sessions grooming</Text>
                          </View>
                          <View
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <Text emphasis="bold" appearance="accent">
                              Showroom
                            </Text>
                          </View>
                          <BlockSpacer spacing="loose" />
                        </BlockStack>
                        <View />
                        <Button
                          kind="primary"
                          overlay={
                            !hasPets
                              ? createPetOverlay("join-now-prive")
                              : undefined
                          }
                          onPress={() => {
                            if (hasPets) {
                              navigation.navigate(
                                "https://test-store-hicc1.myshopify.com/cart/51712181829813:1?go=checkout",
                              );
                            }
                          }}
                        >
                          {hasPets ? "$2000 Save $429" : "Join Now"}
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              {/* 隐私协议 */}
              <Text size="small" appearance="subdued">
                完整权利内容请阅读Hicc Pet
                <Link to="www.baidu.com">会员协议条款</Link>、
                <Link to="www.baidu.com">隐私条款说明</Link>、
                <Link to="www.baidu.com">取消与退款</Link>
              </Text>
              <View />
            </BlockStack>
          </Card>
        </HeadingGroup>
      </BlockStack>
    </BlockStack>
  );
}
