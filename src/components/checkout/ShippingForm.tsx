'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shippingSchema, type ShippingFormData } from '@/lib/validators/checkout';
import type { ShippingInfo } from '@/lib/checkout/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCallback, useRef } from 'react';

interface ShippingFormProps {
  onSubmit: (data: ShippingInfo) => void;
  defaultValues?: Partial<ShippingInfo>;
}

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          roadAddress: string;
          jibunAddress: string;
        }) => void;
      }) => { open: () => void };
    };
  }
}

function loadDaumPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Daum Postcode 스크립트를 불러올 수 없습니다'));
    document.head.appendChild(script);
  });
}

export function ShippingForm({ onSubmit, defaultValues }: ShippingFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      phone: defaultValues?.phone ?? '',
      zipcode: defaultValues?.zipcode ?? '',
      address: defaultValues?.address ?? '',
      detailAddress: defaultValues?.detailAddress ?? '',
    },
  });

  const detailAddressRef = useRef<HTMLInputElement | null>(null);

  const handlePostcodeSearch = useCallback(async () => {
    try {
      await loadDaumPostcodeScript();

      new window.daum.Postcode({
        oncomplete: (data) => {
          const address = data.roadAddress || data.jibunAddress;
          setValue('zipcode', data.zonecode, { shouldValidate: true });
          setValue('address', address, { shouldValidate: true });

          // Focus detail address input after selection
          detailAddressRef.current?.focus();
        },
      }).open();
    } catch {
      alert('우편번호 검색 서비스를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
  }, [setValue]);

  const handleFormSubmit = (data: ShippingFormData) => {
    onSubmit({
      name: data.name,
      phone: data.phone,
      zipcode: data.zipcode,
      address: data.address,
      detailAddress: data.detailAddress ?? '',
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* 수령인 이름 */}
      <div className="space-y-2">
        <Label htmlFor="name">수령인 이름</Label>
        <Input
          id="name"
          type="text"
          placeholder="홍길동"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* 휴대폰 번호 */}
      <div className="space-y-2">
        <Label htmlFor="phone">휴대폰 번호</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="010-1234-5678"
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      {/* 우편번호 */}
      <div className="space-y-2">
        <Label htmlFor="zipcode">우편번호</Label>
        <div className="flex gap-2">
          <Input
            id="zipcode"
            type="text"
            readOnly
            placeholder="우편번호"
            className="flex-1"
            {...register('zipcode')}
          />
          <Button type="button" variant="outline" onClick={handlePostcodeSearch}>
            우편번호 검색
          </Button>
        </div>
        {errors.zipcode && (
          <p className="text-sm text-destructive">{errors.zipcode.message}</p>
        )}
      </div>

      {/* 주소 */}
      <div className="space-y-2">
        <Label htmlFor="address">주소</Label>
        <Input
          id="address"
          type="text"
          readOnly
          placeholder="주소를 검색해 주세요"
          {...register('address')}
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address.message}</p>
        )}
      </div>

      {/* 상세 주소 */}
      <div className="space-y-2">
        <Label htmlFor="detailAddress">상세 주소</Label>
        <Input
          id="detailAddress"
          type="text"
          placeholder="동/호수 등 상세 주소를 입력해 주세요"
          {...register('detailAddress')}
          ref={(e) => {
            register('detailAddress').ref(e);
            detailAddressRef.current = e;
          }}
        />
        {errors.detailAddress && (
          <p className="text-sm text-destructive">{errors.detailAddress.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        결제 단계로
      </Button>
    </form>
  );
}
