import { describe, expect, it } from "vitest";

import {
  createMemberSchema,
  memberListParamsSchema,
} from "@/features/members/schemas/member.schema";

const validInput = {
  fullName: "Ahmad Fauzi",
  memberNumber: "",
  gender: "",
  birthPlace: "",
  birthDate: "",
  email: "",
  phone: "",
  address: "",
  joinDate: "",
  status: "ACTIVE",
  notes: "",
};

describe("createMemberSchema", () => {
  it("mengubah field kosong menjadi null, bukan string kosong", () => {
    const parsed = createMemberSchema.parse(validInput);

    expect(parsed.memberNumber).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.birthDate).toBeNull();
  });

  it("menolak nama yang terlalu pendek", () => {
    const result = createMemberSchema.safeParse({
      ...validInput,
      fullName: "A",
    });
    expect(result.success).toBe(false);
  });

  it("memangkas spasi pada nama", () => {
    const parsed = createMemberSchema.parse({
      ...validInput,
      fullName: "  Siti Aminah  ",
    });
    expect(parsed.fullName).toBe("Siti Aminah");
  });

  it("menormalkan email menjadi huruf kecil", () => {
    const parsed = createMemberSchema.parse({
      ...validInput,
      email: "Ahmad.Fauzi@Contoh.ID",
    });
    expect(parsed.email).toBe("ahmad.fauzi@contoh.id");
  });

  it("menolak email yang tidak valid", () => {
    const result = createMemberSchema.safeParse({
      ...validInput,
      email: "bukan-email",
    });
    expect(result.success).toBe(false);
  });

  it("menolak status di luar daftar", () => {
    const result = createMemberSchema.safeParse({
      ...validInput,
      status: "SUPER_ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("menolak jenis kelamin di luar L/P", () => {
    const result = createMemberSchema.safeParse({ ...validInput, gender: "X" });
    expect(result.success).toBe(false);
  });

  it("tidak menerima organization_id dari input", () => {
    const parsed = createMemberSchema.parse({
      ...validInput,
      organizationId: "11111111-1111-1111-1111-111111111111",
      organization_id: "11111111-1111-1111-1111-111111111111",
    });

    // Tenant tidak boleh pernah datang dari form. Kalau field ini sampai
    // lolos ke hasil parse, data bisa ditulis ke organisasi lain.
    expect(parsed).not.toHaveProperty("organizationId");
    expect(parsed).not.toHaveProperty("organization_id");
  });
});

describe("memberListParamsSchema", () => {
  it("memakai nilai default saat query string kosong", () => {
    const parsed = memberListParamsSchema.parse({});
    expect(parsed).toMatchObject({
      search: "",
      status: "",
      sort: "full_name",
      direction: "asc",
      page: 1,
    });
  });

  it("menolak kolom sort yang tidak dikenal", () => {
    // Kolom pengurutan tidak boleh ditentukan bebas oleh browser.
    const result = memberListParamsSchema.safeParse({ sort: "notes" });
    expect(result.success).toBe(false);
  });

  it("menolak nomor halaman tidak masuk akal", () => {
    expect(memberListParamsSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(memberListParamsSchema.safeParse({ page: -3 }).success).toBe(false);
    expect(memberListParamsSchema.safeParse({ page: 999999 }).success).toBe(
      false,
    );
  });

  it("menerima nomor halaman berupa string dari URL", () => {
    expect(memberListParamsSchema.parse({ page: "3" }).page).toBe(3);
  });
});
